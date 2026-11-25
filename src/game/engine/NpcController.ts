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
  /** Remaining seconds Cat will hang out with the newly arrived visitor before wandering off */
  followTimeRemaining: number;
  /** Elapsed seconds spent accompanying the current visitor */
  followElapsed: number;
  /** Zone where Cat started accompanying the visitor */
  followStartZoneId: string | null;
  /** Cooldown before re-greeting the same visitor (multi-visitor ready) */
  greetCooldown: number;
  /** Visitor ID currently greeted/accompanied (supports future multi-visitor setups) */
  activeVisitorId: string | null;
  /** Preferred resting animation pose while paused ('sit' | 'tail_wag' | 'idle') */
  restPose: 'sit' | 'tail_wag' | 'idle';
  /** Timer for Cat playfully circling / changing poses near the visitor */
  followFidgetTimer: number;
  /** Whether current roaming sprint is a playful "zoomies" run */
  roamZoomies: boolean;
}

export interface NpcUpdateContext {
  dt: number;
  domActivity: DomScheduleActivity;
  playerX: number;
  playerY: number;
  playerIndoors: boolean;
  playerIsRunning: boolean;
  playerZoneId?: string | null;
  visitorId?: string;
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
  private domPlayCooldown = 16;
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
      } else if (role === 'cat_companion') {
        animState = 'sit';
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
        followTimeRemaining: 0,
        followElapsed: 0,
        followStartZoneId: null,
        greetCooldown: 0,
        activeVisitorId: null,
        restPose: 'sit',
        followFidgetTimer: 2.5,
        roamZoomies: false,
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

  private pickCatRestPose(): 'sit' | 'tail_wag' | 'idle' {
    const r = this.rng();
    if (r < 0.5) return 'sit';
    if (r < 0.78) return 'tail_wag';
    return 'idle';
  }

  public update(ctx: NpcUpdateContext): void {
    const ts = this.map.tileSize;
    const dom = this.npcs.find((n) => n.entity.aiRole === 'dom_schedule');
    const cat = this.npcs.find((n) => n.entity.aiRole === 'cat_companion');

    for (const npc of this.npcs) {
      if (npc.emote) {
        npc.emote.ttl -= ctx.dt;
        if (npc.emote.ttl <= 0) npc.emote = null;
      }
    }

    if (dom) {
      this.updateDom(dom, cat, ctx, ts);
    }

    if (cat) {
      this.updateCat(cat, dom, ctx, ts);
    }

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
            cat.restPose = this.pickCatRestPose();
          }
        }
      } else {
        this.domPlayCooldown -= ctx.dt;
        if (this.domPlayCooldown <= 0 && dom.path.length === 0) {
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
    const visitorId = ctx.visitorId || 'local_visitor';
    const currentZoneId = ctx.playerZoneId ?? null;

    if (cat.greetCooldown > 0) {
      cat.greetCooldown = Math.max(0, cat.greetCooldown - ctx.dt);
    }

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

      const moved = this.stepAlongPath(cat, 80, ctx.dt, ts);
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

    // Detect newly arrived visitor (or a different visitor ID in future multi-visitor mode)
    const isNewVisitorArrival =
      ctx.playerIndoors &&
      cat.catState === 'roaming' &&
      ((!cat.hasGreetedThisVisit && cat.greetCooldown <= 0) ||
        (cat.activeVisitorId !== null && cat.activeVisitorId !== visitorId));

    if (!ctx.playerIndoors) {
      if (cat.catState === 'following' || cat.catState === 'greeting') {
        this.releaseCatToRoam(cat, curTile, ctx, 'Meo~');
      }
      cat.hasGreetedThisVisit = false;
      cat.greetCooldown = Math.min(cat.greetCooldown, 2); // Quick reset once visitor exits the house
    } else if (isNewVisitorArrival) {
      cat.catState = 'greeting';
      cat.activeVisitorId = visitorId;
      cat.emote = { kind: 'alert', ttl: 1.2 };
      cat.repathTimer = 0;
      cat.path = [];
    }

    // Priority 2: Running to greet a newly arrived visitor inside the house
    if (cat.catState === 'greeting') {
      if (distToPlayer <= ts * 1.65) {
        cat.hasGreetedThisVisit = true;
        cat.catState = 'following';
        cat.followTimeRemaining = 14 + this.rng() * 6; // Short 14-20s welcome hangout!
        cat.followElapsed = 0;
        cat.followStartZoneId = currentZoneId;
        cat.followFidgetTimer = 2.6 + this.rng() * 1.6;
        cat.restPose = 'sit';
        cat.path = [];
        cat.facing = facingToward(cat.px, cat.py, ctx.playerX, ctx.playerY);
        cat.emote = { kind: 'meow', text: 'Meo~!', ttl: 2.4 };
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

      const moved = this.stepAlongPath(cat, 86, ctx.dt, ts);
      cat.animState = moved ? 'run' : 'tail_wag';
      return;
    }

    // Priority 3: Short-duration friendly following & curious circling around the visitor
    if (cat.catState === 'following') {
      cat.followElapsed += ctx.dt;
      cat.followTimeRemaining -= ctx.dt;

      // Wander off playfully once the welcome timer expires OR visitor changes room after hanging out
      const changedRoomAfterHangout =
        cat.followStartZoneId !== null &&
        currentZoneId !== null &&
        currentZoneId !== cat.followStartZoneId &&
        cat.followElapsed >= 6;

      if (cat.followTimeRemaining <= 0 || changedRoomAfterHangout) {
        this.releaseCatToRoam(cat, curTile, ctx, 'Purr~', currentZoneId);
        return;
      }

      if (distToPlayer > ts * 1.8) {
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
          if (cat.path.length > 1) {
            cat.path.pop();
          }
        }
        const followSpeed = ctx.playerIsRunning || distToPlayer > ts * 3.4 ? 90 : 58;
        const moved = this.stepAlongPath(cat, followSpeed, ctx.dt, ts);
        cat.animState = moved ? (followSpeed > 72 ? 'run' : 'walk') : cat.restPose;
      } else {
        // Near visitor: keep stepping if playfully circling, otherwise sit / tail_wag / circle curiously
        const moved = this.stepAlongPath(cat, 48, ctx.dt, ts);
        if (moved) {
          cat.animState = 'walk';
          return;
        }

        cat.facing = facingToward(cat.px, cat.py, ctx.playerX, ctx.playerY);
        cat.animState = cat.restPose;
        cat.followFidgetTimer -= ctx.dt;
        if (cat.followFidgetTimer <= 0) {
          cat.followFidgetTimer = 2.6 + this.rng() * 2.2;
          if (this.rng() < 0.55) {
            // Walk playfully to a nearby tile around the visitor!
            const nearby = this.pickNearbyIndoorTile(playerTile, 2, ctx.isTileSolidForNpc, ctx.isTileIndoors);
            if (nearby && (nearby.x !== curTile.x || nearby.y !== curTile.y)) {
              cat.path = findPath(
                curTile,
                nearby,
                this.map.width,
                this.map.height,
                ctx.isTileSolidForNpc,
                false
              );
              cat.restPose = this.pickCatRestPose();
            }
          } else {
            // Switch resting animation pose so Cat alternates sitting, tail-wagging & blinking!
            cat.restPose = cat.restPose === 'sit' ? 'tail_wag' : 'sit';
          }
        }
      }
      return;
    }

    // Priority 4: Autonomous roaming across rooms (walk + occasional playful zoomies + sit/tail_wag/idle)
    const roamSpeed = cat.roamZoomies ? 82 : 48;
    const moved = this.stepAlongPath(cat, roamSpeed, ctx.dt, ts);
    if (moved) {
      cat.animState = cat.roamZoomies ? 'run' : 'walk';
      return;
    }

    cat.animState = cat.restPose;
    cat.idleTimer -= ctx.dt;
    // Halfway through a long pause, naturally sit down if currently standing
    if (cat.idleTimer > 0 && cat.idleTimer < 1.8 && cat.restPose === 'tail_wag') {
      cat.restPose = 'sit';
    }

    if (cat.idleTimer <= 0) {
      cat.idleTimer = 3.0 + this.rng() * 4.2;
      cat.restPose = this.pickCatRestPose();
      cat.roamZoomies = this.rng() < 0.28; // 28% playful zoomies sprint across rooms!

      // Occasionally head to Ink's cozy cushion in the kitchen to sit & nap
      const napWp = getWaypoint(this.map, 'cat_nap');
      const target =
        napWp && this.rng() < 0.18
          ? { x: napWp.x, y: napWp.y }
          : this.pickRandomIndoorTile(ctx.isTileSolidForNpc, ctx.isTileIndoors, currentZoneId);

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

  private releaseCatToRoam(
    cat: RuntimeNpc,
    curTile: GridPoint,
    ctx: NpcUpdateContext,
    farewellText: string,
    avoidZoneId?: string | null
  ): void {
    cat.catState = 'roaming';
    cat.followTimeRemaining = 0;
    cat.greetCooldown = 36 + this.rng() * 14;
    cat.roamZoomies = true; // Playfully trot/sprint off to explore another room!
    cat.restPose = 'sit';
    cat.idleTimer = 3.2 + this.rng() * 2.5;
    cat.emote = { kind: 'meow', text: farewellText, ttl: 1.8 };

    const target = this.pickRandomIndoorTile(
      ctx.isTileSolidForNpc,
      ctx.isTileIndoors,
      avoidZoneId
    );
    cat.path = target
      ? findPath(curTile, target, this.map.width, this.map.height, ctx.isTileSolidForNpc, false)
      : [];
  }

  private pickNearbyIndoorTile(
    center: GridPoint,
    radius: number,
    isSolid: (x: number, y: number) => boolean,
    isIndoors: (x: number, y: number) => boolean
  ): GridPoint | null {
    const candidates: GridPoint[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) < 1) continue;
        const x = center.x + dx;
        const y = center.y + dy;
        if (x > 0 && y > 0 && x < this.map.width - 1 && y < this.map.height - 1) {
          if (isIndoors(x, y) && !isSolid(x, y)) {
            candidates.push({ x, y });
          }
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(this.rng() * candidates.length)];
  }

  private pickRandomIndoorTile(
    isSolid: (x: number, y: number) => boolean,
    isIndoors: (x: number, y: number) => boolean,
    preferOutsideZoneId?: string | null
  ): GridPoint | null {
    const all: GridPoint[] = [];
    const otherRoom: GridPoint[] = [];

    const avoidZone = preferOutsideZoneId
      ? this.map.zones?.find((z) => z.id === preferOutsideZoneId)
      : undefined;

    for (let y = 1; y < this.map.height - 1; y++) {
      for (let x = 1; x < this.map.width - 1; x++) {
        if (isIndoors(x, y) && !isSolid(x, y)) {
          const pt = { x, y };
          all.push(pt);
          if (
            avoidZone &&
            !(x >= avoidZone.x && x < avoidZone.x + avoidZone.w && y >= avoidZone.y && y < avoidZone.y + avoidZone.h)
          ) {
            otherRoom.push(pt);
          }
        }
      }
    }
    const pool = otherRoom.length > 0 ? otherRoom : all;
    if (pool.length === 0) return null;
    return pool[Math.floor(this.rng() * pool.length)];
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
