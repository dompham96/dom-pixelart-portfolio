import type {
  CharacterAnimState,
  Direction,
  LocalizedText,
  MapDefinition,
  MapWaypoint,
  NpcEntity,
} from '../../types/content';
import { findPath, type GridPoint } from './Pathfinder';
import type { DomScheduleActivity } from './TimeOfDay';

export type NpcEmoteKind = 'zzz' | 'heart' | 'alert' | 'gaming' | 'meow';

export interface NpcEmote {
  kind: NpcEmoteKind;
  text?: string;
  ttl: number;
}

export type CatBehaviorState = 'roaming' | 'greeting' | 'following' | 'playing_with_dom';

export interface RuntimeNpc {
  entity: NpcEntity;
  /** World pixel coords (top-left of 16x16 tile footprint) */
  px: number;
  py: number;
  facing: Direction;
  animState: CharacterAnimState;
  walkPhase: number;
  path: GridPoint[];
  /** Moving/companion NPCs never hard-block the player in doorways */
  blocksPlayer: boolean;
  emote: NpcEmote | null;
  // Internal AI state
  domActivity: DomScheduleActivity | 'play_cat';
  catState: CatBehaviorState;
  idleTimer: number;
  repathTimer: number;
  hasGreetedThisVisit: boolean;
}

export interface NpcUpdateContext {
  dt: number;
  domActivity: DomScheduleActivity;
  playerX: number;
  playerY: number;
  playerIndoors: boolean;
  playerIsRunning: boolean;
  isTileSolidForNpc: (tx: number, ty: number) => boolean;
  isTileIndoors: (tx: number, ty: number) => boolean;
  onCatMeow: () => void;
}

function getWaypoint(map: MapDefinition, id: string): MapWaypoint | undefined {
  return map.waypoints?.find((w) => w.id === id);
}

function facingToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
}

export class NpcController {
  private map: MapDefinition;
  private npcs: RuntimeNpc[] = [];
  private domPlayCooldown = 16; // Seconds before Dom randomly plays with Cat during work hours
  private domPlayRemaining = 0;
  private playMeetingTile: GridPoint | null = null;
  private rng: () => number;

  constructor(map: MapDefinition, initialActivity: DomScheduleActivity = 'work', rng: () => number = Math.random) {
    this.map = map;
    this.rng = rng;
    this.initNpcs(initialActivity);
  }

  private initNpcs(initialActivity: DomScheduleActivity): void {
    const ts = this.map.tileSize;
    this.npcs = this.map.npcs.map((entity) => {
      const role = entity.aiRole || 'static';
      let startX = entity.x;
      let startY = entity.y;
      let startFacing = entity.facing;
      let animState: CharacterAnimState = 'idle';

      if (role === 'dom_schedule') {
        const wp = this.getDomWaypointForActivity(initialActivity);
        if (wp) {
          startX = wp.x;
          startY = wp.y;
          if (wp.facing) startFacing = wp.facing;
        }
        animState = initialActivity;
      }

      return {
        entity,
        px: startX * ts,
        py: startY * ts,
        facing: startFacing,
        animState,
        walkPhase: 0,
        path: [],
        blocksPlayer: role === 'static',
        emote: null,
        domActivity: initialActivity,
        catState: 'roaming',
        idleTimer: 1.5 + this.rng() * 2.5,
        repathTimer: 0,
        hasGreetedThisVisit: false,
      };
    });
  }

  public getRuntimeNpcs(): RuntimeNpc[] {
    return this.npcs;
  }

  public getNpcById(id: string): RuntimeNpc | undefined {
    return this.npcs.find((n) => n.entity.id === id);
  }

  public getDialogueForNpc(
    runtime: RuntimeNpc,
    seasonalOverrides: Record<string, LocalizedText[]>
  ): LocalizedText[] {
    const sched = runtime.entity.scheduleDialogues;
    if (runtime.entity.aiRole === 'dom_schedule' && sched) {
      if (runtime.domActivity === 'sleep' && sched.sleep) return sched.sleep;
      if (runtime.domActivity === 'play_cat' && sched.play_cat) return sched.play_cat;
      if (runtime.domActivity === 'gaming' && sched.gaming) return sched.gaming;
      if (runtime.domActivity === 'work' && sched.work) return sched.work;
    }
    if (runtime.entity.aiRole === 'cat_companion' && sched) {
      if (runtime.catState === 'playing_with_dom' && sched.play_cat) return sched.play_cat;
      if (runtime.catState === 'following' && sched.follow) return sched.follow;
    }
    return seasonalOverrides[runtime.entity.id] || runtime.entity.dialogue;
  }

  public isBlockingTile(tx: number, ty: number): boolean {
    const ts = this.map.tileSize;
    for (const npc of this.npcs) {
      if (!npc.blocksPlayer) continue;
      const nx = Math.round(npc.px / ts);
      const ny = Math.round(npc.py / ts);
      if (nx === tx && ny === ty) return true;
    }
    return false;
  }

  private getDomWaypointForActivity(activity: DomScheduleActivity): MapWaypoint | undefined {
    if (activity === 'sleep') return getWaypoint(this.map, 'dom_bed');
    if (activity === 'gaming') return getWaypoint(this.map, 'dom_game');
    return getWaypoint(this.map, 'dom_desk');
  }

  public update(ctx: NpcUpdateContext): void {
    const ts = this.map.tileSize;
    const dom = this.npcs.find((n) => n.entity.aiRole === 'dom_schedule');
    const cat = this.npcs.find((n) => n.entity.aiRole === 'cat_companion');

    // Update emote timers for all NPCs
    for (const npc of this.npcs) {
      if (npc.emote) {
        npc.emote.ttl -= ctx.dt;
        if (npc.emote.ttl <= 0) npc.emote = null;
      }
    }

    // 1. Update Dom's daily schedule & random cat playtime
    if (dom) {
      this.updateDom(dom, cat, ctx, ts);
    }

    // 2. Update Cat Ink's autonomous roaming / greeting / following
    if (cat) {
      this.updateCat(cat, dom, ctx, ts);
    }

    // 3. Static NPCs politely turn to face the visitor when nearby
    for (const npc of this.npcs) {
      if ((npc.entity.aiRole || 'static') !== 'static') continue;
      const dist = Math.hypot(npc.px - ctx.playerX, npc.py - ctx.playerY);
      if (dist <= ts * 2.2) {
        npc.facing = facingToward(npc.px, npc.py, ctx.playerX, ctx.playerY);
      } else {
        npc.facing = npc.entity.facing;
      }
    }
  }

  private updateDom(
    dom: RuntimeNpc,
    cat: RuntimeNpc | undefined,
    ctx: NpcUpdateContext,
    ts: number
  ): void {
    // Handle random playtime with cat during work hours (09:00 - 17:00)
    if (ctx.domActivity === 'work' && cat) {
      if (this.domPlayRemaining > 0) {
        this.domPlayRemaining -= ctx.dt;
        if (this.domPlayRemaining <= 0) {
          this.domPlayRemaining = 0;
          this.playMeetingTile = null;
          dom.domActivity = 'work';
          this.domPlayCooldown = 22 + this.rng() * 18;
          if (cat.catState === 'playing_with_dom') {
            cat.catState = 'roaming';
            cat.path = [];
            cat.idleTimer = 1.2;
          }
        }
      } else {
        this.domPlayCooldown -= ctx.dt;
        if (this.domPlayCooldown <= 0 && dom.path.length === 0) {
          // Trigger playful break with Cat Ink!
          const playWp = getWaypoint(this.map, 'cat_play');
          this.playMeetingTile = playWp
            ? { x: playWp.x, y: playWp.y }
            : { x: Math.round(dom.px / ts), y: Math.round(dom.py / ts) };
          this.domPlayRemaining = 10 + this.rng() * 4;
          dom.domActivity = 'play_cat';
          cat.catState = 'playing_with_dom';
          cat.path = [];
          dom.path = [];
        }
      }
    } else {
      // Outside work hours, cancel any active cat playtime
      if (this.domPlayRemaining > 0) {
        this.domPlayRemaining = 0;
        this.playMeetingTile = null;
        if (cat && cat.catState === 'playing_with_dom') {
          cat.catState = 'roaming';
          cat.path = [];
        }
      }
      dom.domActivity = ctx.domActivity;
    }

    // Resolve desired destination tile for Dom
    let targetTile: GridPoint | null = null;
    let targetFacing: Direction | undefined;

    if (dom.domActivity === 'play_cat' && this.playMeetingTile) {
      targetTile = this.playMeetingTile;
    } else {
      const wp = this.getDomWaypointForActivity(ctx.domActivity);
      if (wp) {
        targetTile = { x: wp.x, y: wp.y };
        targetFacing = wp.facing;
      }
    }

    const curTile = { x: Math.round(dom.px / ts), y: Math.round(dom.py / ts) };
    if (targetTile && (curTile.x !== targetTile.x || curTile.y !== targetTile.y)) {
      if (dom.path.length === 0) {
        dom.path = findPath(
          curTile,
          targetTile,
          this.map.width,
          this.map.height,
          ctx.isTileSolidForNpc,
          false
        );
      }
    }

    const moved = this.stepAlongPath(dom, 52, ctx.dt, ts);
    if (moved) {
      dom.animState = 'walk';
      return;
    }

    // Dom is at his destination
    if (dom.domActivity === 'sleep') {
      dom.animState = 'sleep';
      dom.facing = targetFacing || 'down';
      if (!dom.emote) {
        dom.emote = { kind: 'zzz', ttl: 2.2 };
      }
    } else if (dom.domActivity === 'play_cat') {
      dom.animState = 'play';
      if (cat) {
        dom.facing = facingToward(dom.px, dom.py, cat.px, cat.py);
        const distToCat = Math.hypot(dom.px - cat.px, dom.py - cat.py);
        if (distToCat <= ts * 2.1 && !dom.emote) {
          dom.emote = { kind: 'heart', ttl: 1.8 };
        }
      }
    } else if (dom.domActivity === 'gaming') {
      dom.animState = 'gaming';
      const distPlayer = Math.hypot(dom.px - ctx.playerX, dom.py - ctx.playerY);
      dom.facing =
        distPlayer <= ts * 2
          ? facingToward(dom.px, dom.py, ctx.playerX, ctx.playerY)
          : targetFacing || 'up';
      if (!dom.emote && this.rng() < ctx.dt * 0.35) {
        dom.emote = { kind: 'gaming', ttl: 2.0 };
      }
    } else {
      dom.animState = 'work';
      const distPlayer = Math.hypot(dom.px - ctx.playerX, dom.py - ctx.playerY);
      dom.facing =
        distPlayer <= ts * 2
          ? facingToward(dom.px, dom.py, ctx.playerX, ctx.playerY)
          : targetFacing || 'up';
    }
  }

  private updateCat(
    cat: RuntimeNpc,
    dom: RuntimeNpc | undefined,
    ctx: NpcUpdateContext,
    ts: number
  ): void {
    const curTile = { x: Math.round(cat.px / ts), y: Math.round(cat.py / ts) };
    const playerTile = { x: Math.round(ctx.playerX / ts), y: Math.round(ctx.playerY / ts) };
    const distToPlayer = Math.hypot(cat.px - ctx.playerX, cat.py - ctx.playerY);

    // Priority 1: Playing with Dom (interrupts roaming & following)
    if (cat.catState === 'playing_with_dom' && dom && this.playMeetingTile) {
      const goalTile = { x: this.playMeetingTile.x - 1, y: this.playMeetingTile.y };
      const chosenGoal = ctx.isTileSolidForNpc(goalTile.x, goalTile.y)
        ? { x: this.playMeetingTile.x + 1, y: this.playMeetingTile.y }
        : goalTile;

      if (curTile.x !== chosenGoal.x || curTile.y !== chosenGoal.y) {
        if (cat.path.length === 0) {
          cat.path = findPath(
            curTile,
            chosenGoal,
            this.map.width,
            this.map.height,
            ctx.isTileSolidForNpc,
            false
          );
        }
      }

      const moved = this.stepAlongPath(cat, 76, ctx.dt, ts);
      if (moved) {
        cat.animState = 'run';
      } else {
        cat.animState = 'play';
        cat.facing = facingToward(cat.px, cat.py, dom.px, dom.py);
        if (!cat.emote) {
          cat.emote = { kind: 'heart', ttl: 1.8 };
        }
      }
      return;
    }

    // Reset visit greeting flag when visitor leaves the house
    if (!ctx.playerIndoors) {
      if (cat.catState === 'following' || cat.catState === 'greeting') {
        cat.catState = 'roaming';
        cat.path = [];
        cat.idleTimer = 1.0;
        cat.emote = { kind: 'meow', text: 'Meo~', ttl: 1.8 };
      }
      cat.hasGreetedThisVisit = false;
    } else if (!cat.hasGreetedThisVisit && cat.catState === 'roaming') {
      // Visitor just stepped into the house while cat is free -> run out to greet!
      cat.catState = 'greeting';
      cat.emote = { kind: 'alert', ttl: 1.2 };
      cat.repathTimer = 0;
      cat.path = [];
    }

    // Priority 2: Running to greet visitor who entered the house
    if (cat.catState === 'greeting') {
      if (distToPlayer <= ts * 1.65) {
        cat.hasGreetedThisVisit = true;
        cat.catState = 'following';
        cat.path = [];
        cat.facing = facingToward(cat.px, cat.py, ctx.playerX, ctx.playerY);
        cat.emote = { kind: 'meow', text: 'Meo~!', ttl: 2.6 };
        ctx.onCatMeow();
        return;
      }

      cat.repathTimer -= ctx.dt;
      if (cat.repathTimer <= 0 || cat.path.length === 0) {
        cat.repathTimer = 0.45;
        cat.path = findPath(
          curTile,
          playerTile,
          this.map.width,
          this.map.height,
          ctx.isTileSolidForNpc,
          true
        );
      }

      const moved = this.stepAlongPath(cat, 84, ctx.dt, ts);
      cat.animState = moved ? 'run' : 'idle';
      return;
    }

    // Priority 3: Following visitor politely around all rooms inside the house
    if (cat.catState === 'following') {
      if (distToPlayer > ts * 1.65) {
        cat.repathTimer -= ctx.dt;
        if (cat.repathTimer <= 0 || cat.path.length === 0) {
          cat.repathTimer = 0.35;
          cat.path = findPath(
            curTile,
            playerTile,
            this.map.width,
            this.map.height,
            ctx.isTileSolidForNpc,
            true
          );
          // Stop 1 tile short of the visitor so cat trails right behind
          if (cat.path.length > 1) {
            cat.path.pop();
          }
        }
        const followSpeed = ctx.playerIsRunning || distToPlayer > ts * 3.5 ? 92 : 60;
        const moved = this.stepAlongPath(cat, followSpeed, ctx.dt, ts);
        cat.animState = moved ? (followSpeed > 75 ? 'run' : 'walk') : 'idle';
      } else {
        cat.path = [];
        cat.animState = 'idle';
        cat.walkPhase = 0;
        cat.facing = facingToward(cat.px, cat.py, ctx.playerX, ctx.playerY);
      }
      return;
    }

    // Priority 4: Autonomous roaming across the house
    const moved = this.stepAlongPath(cat, 46, ctx.dt, ts);
    if (moved) {
      cat.animState = 'walk';
      return;
    }

    cat.animState = 'idle';
    cat.idleTimer -= ctx.dt;
    if (cat.idleTimer <= 0) {
      cat.idleTimer = 2.5 + this.rng() * 4.0;
      const target = this.pickRandomIndoorTile(ctx.isTileSolidForNpc, ctx.isTileIndoors);
      if (target) {
        cat.path = findPath(
          curTile,
          target,
          this.map.width,
          this.map.height,
          ctx.isTileSolidForNpc,
          false
        );
      }
    }
  }

  private pickRandomIndoorTile(
    isSolid: (x: number, y: number) => boolean,
    isIndoors: (x: number, y: number) => boolean
  ): GridPoint | null {
    const candidates: GridPoint[] = [];
    for (let y = 1; y < this.map.height - 1; y++) {
      for (let x = 1; x < this.map.width - 1; x++) {
        if (isIndoors(x, y) && !isSolid(x, y)) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(this.rng() * candidates.length)];
  }

  private stepAlongPath(npc: RuntimeNpc, speed: number, dt: number, ts: number): boolean {
    if (npc.path.length === 0) {
      npc.walkPhase = 0;
      return false;
    }

    const next = npc.path[0];
    const targetX = next.x * ts;
    const targetY = next.y * ts;
    const dx = targetX - npc.px;
    const dy = targetY - npc.py;
    const dist = Math.hypot(dx, dy);

    if (dist <= speed * dt + 0.5) {
      npc.px = targetX;
      npc.py = targetY;
      npc.path.shift();
    } else {
      npc.px += (dx / dist) * speed * dt;
      npc.py += (dy / dist) * speed * dt;
      npc.facing = facingToward(0, 0, dx, dy);
    }

    npc.walkPhase += dt * (speed / 56);
    return true;
  }
}
