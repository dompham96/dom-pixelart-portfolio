import type {
  CharacterAnimState,
  Direction,
  LocalizedText,
  MapDefinition,
  MapProp,
  MapZone,
  NpcEntity,
  SeasonConfig,
  SurfaceType,
  TimeOfDayMode,
} from '../../types/content';
import { drawCharacter, drawProp, drawTile } from '../sprites/pixelRenderer';
import { spriteManager } from '../sprites/SpriteManager';
import { findPath, type GridPoint } from './Pathfinder';
import { NpcController } from './NpcController';
import { evaluateTimeOfDay, type TimeOfDayState } from './TimeOfDay';
import { soundEngine } from '../../audio/SoundEngine';

export type InteractionEvent =
  | { kind: 'prop'; prop: MapProp }
  | { kind: 'npc'; npc: NpcEntity; dialogue: LocalizedText[] };

export interface NearbyPrompt {
  label: LocalizedText;
  kind: 'prop' | 'npc';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  maxTtl: number;
}

const SOLID_TILES = new Set(['.', 'T', 'I', 'W', 'N']);

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D | null;

  private map: MapDefinition;
  private season: SeasonConfig;
  private onInteract: (event: InteractionEvent) => void;
  private onNearbyChange: (prompt: NearbyPrompt | null) => void;
  private onZoneChange?: (zone: MapZone | null) => void;
  private onTimeStateChange?: (state: TimeOfDayState) => void;

  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private paused = false;

  // Time of day & NPC AI
  private timeMode: TimeOfDayMode;
  private timeState: TimeOfDayState;
  private clockSyncCooldown = 0;
  private npcController: NpcController;

  // Player state in world pixel coords (1 tile = map.tileSize = 16px)
  private playerX: number;
  private playerY: number;
  private facing: Direction;
  private walkPhase = 0;
  private playerAnimState: CharacterAnimState = 'idle';
  private stepSoundCooldown = 0;
  private dustCooldown = 0;

  // Input state
  private keys = new Set<string>();
  private virtualDir: Direction | null = null;
  private virtualRun = false;
  private path: GridPoint[] = [];
  private pendingInteraction: InteractionEvent | null = null;
  private tapMarker: { x: number; y: number; ttl: number } | null = null;

  // Camera state
  private camX = 0;
  private camY = 0;
  private scale = 3;

  // Particles & dust puffs
  private particles: Particle[] = [];
  private dustPuffs: DustPuff[] = [];

  // Nearby & zone tracking
  private lastNearbyId: string | null = null;
  private currentNearby: { id: string; event: InteractionEvent; label: LocalizedText } | null = null;
  private lastZoneId: string | null = null;
  private lastIndoors: boolean | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    map: MapDefinition,
    season: SeasonConfig,
    timeMode: TimeOfDayMode,
    onInteract: (event: InteractionEvent) => void,
    onNearbyChange: (prompt: NearbyPrompt | null) => void,
    onZoneChange?: (zone: MapZone | null) => void,
    onTimeStateChange?: (state: TimeOfDayState) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');
    this.ctx = ctx;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = map.width * map.tileSize;
    this.lightCanvas.height = map.height * map.tileSize;
    this.lightCtx = this.lightCanvas.getContext('2d');

    this.map = map;
    this.season = season;
    this.timeMode = timeMode;
    this.timeState = evaluateTimeOfDay(timeMode);
    this.onInteract = onInteract;
    this.onNearbyChange = onNearbyChange;
    this.onZoneChange = onZoneChange;
    this.onTimeStateChange = onTimeStateChange;

    this.playerX = map.spawn.x * map.tileSize;
    this.playerY = map.spawn.y * map.tileSize;
    this.facing = map.spawn.facing;

    spriteManager.init();
    this.preloadMapAssets();

    this.npcController = new NpcController(map, this.timeState.domActivity);

    this.initParticles();
    this.resize();
    this.snapCamera();
    this.updateZoneAndAudio();
    this.onTimeStateChange?.(this.timeState);
    this.start();
  }

  private preloadMapAssets(): void {
    spriteManager.preloadImage(this.map.layers?.ground);
    spriteManager.preloadImage(this.map.layers?.groundSunset);
    spriteManager.preloadImage(this.map.layers?.groundNight);
    spriteManager.preloadImage(this.map.layers?.foreground);
    spriteManager.preloadImage(this.map.layers?.nightOverlay);
    spriteManager.preloadImage(this.season.mapOverlay);
  }

  private getAllProps(): MapProp[] {
    return [...this.map.props, ...this.season.extraProps];
  }

  public setSeason(season: SeasonConfig): void {
    this.season = season;
    spriteManager.preloadImage(season.mapOverlay);
    this.initParticles();
    soundEngine.setEnvironment(this.season.id, this.timeState.period, Boolean(this.lastIndoors));
  }

  public setTimeMode(mode: TimeOfDayMode): void {
    this.timeMode = mode;
    this.timeState = evaluateTimeOfDay(mode);
    this.onTimeStateChange?.(this.timeState);
    soundEngine.setEnvironment(this.season.id, this.timeState.period, Boolean(this.lastIndoors));
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.keys.clear();
      this.virtualDir = null;
    }
  }

  public setVirtualDirection(dir: Direction | null): void {
    this.virtualDir = dir;
    if (dir) {
      this.path = [];
      this.pendingInteraction = null;
    }
  }

  public setVirtualRun(running: boolean): void {
    this.virtualRun = running;
  }

  public handleKeyDown(code: string): void {
    if (this.paused) return;
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'ShiftLeft',
        'ShiftRight',
      ].includes(code)
    ) {
      this.keys.add(code);
      if (code !== 'ShiftLeft' && code !== 'ShiftRight') {
        this.path = [];
        this.pendingInteraction = null;
      }
    } else if (code === 'KeyE' || code === 'Space' || code === 'Enter') {
      this.triggerInteract();
    }
  }

  public handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.max(1, Math.floor(width * dpr));
    this.canvas.height = Math.max(1, Math.floor(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const minDim = Math.min(width, height);
    const baseZoom = minDim < 520 ? 3 : minDim < 820 ? 3 : 4;
    this.scale = baseZoom * dpr;
  }

  private initParticles(): void {
    const worldW = this.map.width * this.map.tileSize;
    const worldH = this.map.height * this.map.tileSize;
    this.particles = Array.from({ length: this.season.particleCount }, () => ({
      x: Math.random() * worldW,
      y: Math.random() * worldH,
      vx: (Math.random() - 0.5) * 6,
      vy:
        this.season.particleType === 'lanterns'
          ? -(6 + Math.random() * 8)
          : this.season.particleType === 'petals' || this.season.particleType === 'snow'
            ? 8 + Math.random() * 10
            : (Math.random() - 0.5) * 4,
      size: this.season.particleType === 'lanterns' ? 3 : 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  private isTileIndoors(tx: number, ty: number): boolean {
    const rects = this.map.indoorRects;
    if (rects && rects.length > 0) {
      return rects.some(
        (r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h
      );
    }
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return false;
    const ch = this.map.tiles[ty][tx];
    return ch === 'F' || ch === 'C' || ch === 'K';
  }

  private getSurfaceAtTile(tx: number, ty: number): SurfaceType {
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return 'wood';
    const ch = this.map.tiles[ty][tx];
    if (ch === 'G') return 'grass';
    if (ch === 'P' || ch === 'K') return 'stone';
    if (ch === 'C') return 'carpet';
    return 'wood';
  }

  private isTileStaticSolid(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return true;
    const ch = this.map.tiles[ty][tx];
    if (SOLID_TILES.has(ch)) return true;

    for (const prop of this.getAllProps()) {
      if (!prop.solid) continue;
      const pw = prop.w || 1;
      const ph = prop.h || 1;
      if (tx >= prop.x && tx < prop.x + pw && ty >= prop.y && ty < prop.y + ph) {
        return true;
      }
    }
    return false;
  }

  private isTileBlockedForPlayer(tx: number, ty: number): boolean {
    if (this.isTileStaticSolid(tx, ty)) return true;
    // Only static NPCs block movement; moving Dom & Cat Ink never trap the player in doorways
    if (this.npcController.isBlockingTile(tx, ty)) return true;
    return false;
  }

  private isRectBlocked(px: number, py: number): boolean {
    const ts = this.map.tileSize;
    const left = Math.floor((px + 3) / ts);
    const right = Math.floor((px + ts - 4) / ts);
    const top = Math.floor((py + 6) / ts);
    const bottom = Math.floor((py + ts - 2) / ts);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (this.isTileBlockedForPlayer(tx, ty)) return true;
      }
    }
    return false;
  }

  public handlePointerTap(clientX: number, clientY: number): void {
    if (this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.canvas.width / Math.max(1, rect.width);
    const canvasX = (clientX - rect.left) * dpr;
    const canvasY = (clientY - rect.top) * dpr;

    const worldX = canvasX / this.scale + this.camX;
    const worldY = canvasY / this.scale + this.camY;
    const ts = this.map.tileSize;
    const tx = Math.floor(worldX / ts);
    const ty = Math.floor(worldY / ts);

    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

    this.tapMarker = {
      x: tx * ts + ts / 2,
      y: ty * ts + ts / 2,
      ttl: 0.45,
    };

    // Check live moving NPC positions first (with forgiving 12px click radius)
    let tappedEvent: InteractionEvent | null = null;
    let targetTile = { x: tx, y: ty };

    const tappedNpc = this.npcController.getRuntimeNpcs().find((r) => {
      const dist = Math.hypot(r.px + ts / 2 - worldX, r.py + ts / 2 - worldY);
      return dist <= ts * 0.9;
    });

    if (tappedNpc) {
      targetTile = { x: Math.round(tappedNpc.px / ts), y: Math.round(tappedNpc.py / ts) };
      tappedEvent = {
        kind: 'npc',
        npc: tappedNpc.entity,
        dialogue: this.npcController.getDialogueForNpc(
          tappedNpc,
          this.season.npcDialogueOverrides
        ),
      };
    } else {
      const prop = this.getAllProps().find((p) => {
        if (!p.action) return false;
        const pw = p.w || 1;
        const ph = p.h || 1;
        return tx >= p.x && tx < p.x + pw && ty >= p.y && ty < p.y + ph;
      });
      if (prop) {
        tappedEvent = { kind: 'prop', prop };
      }
    }

    const startTile: GridPoint = {
      x: Math.round(this.playerX / ts),
      y: Math.round(this.playerY / ts),
    };

    if (
      tappedEvent &&
      Math.abs(startTile.x - targetTile.x) + Math.abs(startTile.y - targetTile.y) <= 1
    ) {
      this.path = [];
      this.pendingInteraction = null;
      soundEngine.playChime();
      this.onInteract(tappedEvent);
      return;
    }

    const path = findPath(
      startTile,
      targetTile,
      this.map.width,
      this.map.height,
      (x, y) => this.isTileBlockedForPlayer(x, y),
      Boolean(tappedEvent)
    );

    this.path = path;
    this.pendingInteraction = tappedEvent;
  }

  public triggerInteract(): void {
    if (this.paused || !this.currentNearby) return;
    soundEngine.playChime();
    this.onInteract(this.currentNearby.event);
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private getKeyboardVector(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.virtualDir === 'up') dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS') || this.virtualDir === 'down') dy += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this.virtualDir === 'left') dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD') || this.virtualDir === 'right') dx += 1;
    return { dx, dy };
  }

  private isRunRequested(): boolean {
    return this.virtualRun || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  private update(dt: number): void {
    this.elapsed += dt;
    this.updateParticles(dt);
    this.updateDustPuffs(dt);

    // Refresh real-time auto clock periodically
    if (this.timeMode === 'auto') {
      this.clockSyncCooldown -= dt;
      if (this.clockSyncCooldown <= 0) {
        this.clockSyncCooldown = 15;
        const next = evaluateTimeOfDay('auto');
        if (next.clockText !== this.timeState.clockText) {
          this.timeState = next;
          this.onTimeStateChange?.(next);
          soundEngine.setEnvironment(this.season.id, next.period, Boolean(this.lastIndoors));
        }
      }
    }

    if (this.tapMarker) {
      this.tapMarker.ttl -= dt;
      if (this.tapMarker.ttl <= 0) this.tapMarker = null;
    }

    if (this.paused) return;

    const wantRun = this.isRunRequested();
    const speed = wantRun ? 106 : 64;
    let isMoving = false;
    const { dx, dy } = this.getKeyboardVector();

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      const vx = (dx / len) * speed * dt;
      const vy = (dy / len) * speed * dt;

      if (Math.abs(dx) >= Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
      } else {
        this.facing = dy > 0 ? 'down' : 'up';
      }

      if (!this.isRectBlocked(this.playerX + vx, this.playerY)) {
        this.playerX += vx;
        isMoving = true;
      }
      if (!this.isRectBlocked(this.playerX, this.playerY + vy)) {
        this.playerY += vy;
        isMoving = true;
      }
    } else if (this.path.length > 0) {
      const next = this.path[0];
      const targetX = next.x * this.map.tileSize;
      const targetY = next.y * this.map.tileSize;
      const diffX = targetX - this.playerX;
      const diffY = targetY - this.playerY;
      const dist = Math.hypot(diffX, diffY);

      if (dist <= speed * dt + 0.5) {
        this.playerX = targetX;
        this.playerY = targetY;
        this.path.shift();
        isMoving = true;
        if (this.path.length === 0 && this.pendingInteraction) {
          const event = this.pendingInteraction;
          this.pendingInteraction = null;
          soundEngine.playChime();
          this.onInteract(event);
        }
      } else {
        this.playerX += (diffX / dist) * speed * dt;
        this.playerY += (diffY / dist) * speed * dt;
        if (Math.abs(diffX) >= Math.abs(diffY)) {
          this.facing = diffX > 0 ? 'right' : 'left';
        } else {
          this.facing = diffY > 0 ? 'down' : 'up';
        }
        isMoving = true;
      }
    }

    const isRunningNow = isMoving && wantRun;
    this.playerAnimState = isRunningNow ? 'run' : isMoving ? 'walk' : 'idle';

    const ptx = Math.floor((this.playerX + this.map.tileSize / 2) / this.map.tileSize);
    const pty = Math.floor((this.playerY + this.map.tileSize / 2) / this.map.tileSize);

    if (isMoving) {
      this.walkPhase += dt * (isRunningNow ? 1.4 : 1);
      this.stepSoundCooldown -= dt;
      if (this.stepSoundCooldown <= 0) {
        const surface = this.getSurfaceAtTile(ptx, pty);
        soundEngine.playStep(surface, isRunningNow);
        this.stepSoundCooldown = isRunningNow ? 0.19 : 0.28;
      }
      if (isRunningNow) {
        this.dustCooldown -= dt;
        if (this.dustCooldown <= 0) {
          this.dustCooldown = 0.13;
          this.dustPuffs.push({
            x: this.playerX + 8 + (Math.random() - 0.5) * 4,
            y: this.playerY + 14,
            vx: (Math.random() - 0.5) * 8,
            vy: -(4 + Math.random() * 6),
            ttl: 0.35,
            maxTtl: 0.35,
          });
        }
      }
    } else {
      this.walkPhase = 0;
    }

    // Update indoor zone & sound environment
    const playerIndoors = this.updateZoneAndAudio();

    // Update Dom's daily schedule & Cat Ink's companion AI
    this.npcController.update({
      dt,
      domActivity: this.timeState.domActivity,
      playerX: this.playerX,
      playerY: this.playerY,
      playerIndoors,
      playerIsRunning: isRunningNow,
      isTileSolidForNpc: (tx, ty) => this.isTileStaticSolid(tx, ty),
      isTileIndoors: (tx, ty) => this.isTileIndoors(tx, ty),
      onCatMeow: () => soundEngine.playMeow(),
    });

    this.updateCamera(dt);
    this.updateNearbyInteractable();
  }

  private updateZoneAndAudio(): boolean {
    const ts = this.map.tileSize;
    const ptx = Math.floor((this.playerX + ts / 2) / ts);
    const pty = Math.floor((this.playerY + ts / 2) / ts);
    const indoors = this.isTileIndoors(ptx, pty);

    if (this.lastIndoors !== indoors) {
      this.lastIndoors = indoors;
      soundEngine.setEnvironment(this.season.id, this.timeState.period, indoors);
    }

    if (this.map.zones && this.map.zones.length > 0) {
      const zone =
        this.map.zones.find(
          (z) => ptx >= z.x && ptx < z.x + z.w && pty >= z.y && pty < z.y + z.h
        ) || null;
      const nextId = zone ? zone.id : null;
      if (nextId !== this.lastZoneId) {
        this.lastZoneId = nextId;
        this.onZoneChange?.(zone);
      }
    }

    return indoors;
  }

  private updateParticles(dt: number): void {
    const worldW = this.map.width * this.map.tileSize;
    const worldH = this.map.height * this.map.tileSize;
    for (const p of this.particles) {
      p.phase += dt * 2;
      p.x += (p.vx + Math.sin(p.phase) * 3) * dt;
      p.y += p.vy * dt;

      if (p.x < 0) p.x += worldW;
      if (p.x > worldW) p.x -= worldW;
      if (p.y < 0) p.y += worldH;
      if (p.y > worldH) p.y -= worldH;
    }
  }

  private updateDustPuffs(dt: number): void {
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      d.ttl -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.ttl <= 0) {
        this.dustPuffs.splice(i, 1);
      }
    }
  }

  private snapCamera(): void {
    const viewW = this.canvas.width / this.scale;
    const viewH = this.canvas.height / this.scale;
    const worldW = this.map.width * this.map.tileSize;
    const worldH = this.map.height * this.map.tileSize;

    const targetX = this.playerX + 8 - viewW / 2;
    const targetY = this.playerY + 8 - viewH / 2;

    this.camX = worldW <= viewW ? (worldW - viewW) / 2 : Math.max(0, Math.min(worldW - viewW, targetX));
    this.camY = worldH <= viewH ? (worldH - viewH) / 2 : Math.max(0, Math.min(worldH - viewH, targetY));
  }

  private updateCamera(dt: number): void {
    const viewW = this.canvas.width / this.scale;
    const viewH = this.canvas.height / this.scale;
    const worldW = this.map.width * this.map.tileSize;
    const worldH = this.map.height * this.map.tileSize;

    const rawX = this.playerX + 8 - viewW / 2;
    const rawY = this.playerY + 8 - viewH / 2;
    const goalX = worldW <= viewW ? (worldW - viewW) / 2 : Math.max(0, Math.min(worldW - viewW, rawX));
    const goalY = worldH <= viewH ? (worldH - viewH) / 2 : Math.max(0, Math.min(worldH - viewH, rawY));

    const lerp = Math.min(1, dt * 8);
    this.camX += (goalX - this.camX) * lerp;
    this.camY += (goalY - this.camY) * lerp;
  }

  private updateNearbyInteractable(): void {
    const ts = this.map.tileSize;
    const pCx = this.playerX + ts / 2;
    const pCy = this.playerY + ts / 2;

    let best: { id: string; dist: number; event: InteractionEvent; label: LocalizedText } | null = null;
    const maxDist = ts * 1.75;

    for (const runtime of this.npcController.getRuntimeNpcs()) {
      const dist = Math.hypot(runtime.px + ts / 2 - pCx, runtime.py + ts / 2 - pCy);
      if (dist <= maxDist && (!best || dist < best.dist)) {
        best = {
          id: `npc:${runtime.entity.id}`,
          dist,
          event: {
            kind: 'npc',
            npc: runtime.entity,
            dialogue: this.npcController.getDialogueForNpc(
              runtime,
              this.season.npcDialogueOverrides
            ),
          },
          label: runtime.entity.name,
        };
      }
    }

    for (const prop of this.getAllProps()) {
      if (!prop.action || !prop.label) continue;
      const pw = (prop.w || 1) * ts;
      const ph = (prop.h || 1) * ts;
      const closestX = Math.max(prop.x * ts, Math.min(pCx, prop.x * ts + pw));
      const closestY = Math.max(prop.y * ts, Math.min(pCy, prop.y * ts + ph));
      const dist = Math.hypot(closestX - pCx, closestY - pCy);
      if (dist <= ts * 1.15 && (!best || dist < best.dist)) {
        best = {
          id: `prop:${prop.id}`,
          dist,
          event: { kind: 'prop', prop },
          label: prop.label,
        };
      }
    }

    const nextId = best ? best.id : null;
    this.currentNearby = best ? { id: best.id, event: best.event, label: best.label } : null;

    if (nextId !== this.lastNearbyId) {
      this.lastNearbyId = nextId;
      this.onNearbyChange(best ? { label: best.label, kind: best.event.kind } : null);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const ts = this.map.tileSize;
    const worldW = this.map.width * ts;
    const worldH = this.map.height * ts;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.timeState.period === 'day' ? this.timeState.skyColor : this.season.skyColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));

    // 1. Base map layer: prefer artist-lit Photoshop ground PNGs (day / sunset / night)
    const groundDay = spriteManager.getImage(this.map.layers?.ground);
    const groundSunset = spriteManager.getImage(this.map.layers?.groundSunset);
    const groundNight = spriteManager.getImage(this.map.layers?.groundNight);

    const hasCustomNight = Boolean(groundNight && this.timeState.period === 'night');
    const hasCustomSunset = Boolean(groundSunset && this.timeState.period === 'sunset');

    if (hasCustomNight && groundNight) {
      ctx.drawImage(groundNight, 0, 0, worldW, worldH);
    } else if (hasCustomSunset && groundSunset) {
      ctx.drawImage(groundSunset, 0, 0, worldW, worldH);
    } else if (groundDay) {
      ctx.drawImage(groundDay, 0, 0, worldW, worldH);
    } else {
      for (let y = 0; y < this.map.height; y++) {
        const row = this.map.tiles[y];
        for (let x = 0; x < this.map.width; x++) {
          drawTile(ctx, row[x], x * ts, y * ts, ts);
        }
      }
    }

    // 2. Tap destination indicator
    if (this.tapMarker) {
      ctx.strokeStyle = 'rgba(255, 207, 61, 0.85)';
      ctx.lineWidth = 1;
      const r = 3 + (0.45 - this.tapMarker.ttl) * 8;
      ctx.strokeRect(
        Math.round(this.tapMarker.x - r / 2),
        Math.round(this.tapMarker.y - r / 2),
        Math.round(r),
        Math.round(r)
      );
    }

    // 2.5 Running pixel dust puffs behind characters
    for (const d of this.dustPuffs) {
      const alpha = Math.max(0, d.ttl / d.maxTtl) * 0.65;
      ctx.fillStyle = `rgba(245, 239, 230, ${alpha.toFixed(2)})`;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }

    // 3. Y-sorted props, dynamic NPCs, and Player for natural top-down depth
    type RenderItem = { sortY: number; draw: () => void };
    const drawList: RenderItem[] = [];

    for (const prop of this.getAllProps()) {
      const isNearby = this.currentNearby?.id === `prop:${prop.id}`;
      const yOffset =
        prop.kind === 'art_frame' ||
        prop.kind === 'behind_scenes_board' ||
        prop.kind === 'bed' ||
        prop.kind === 'cat_bed'
          ? -3
          : 0;
      drawList.push({
        sortY: prop.y * ts + yOffset,
        draw: () => drawProp(ctx, prop, ts, this.elapsed, isNearby),
      });
    }

    for (const runtime of this.npcController.getRuntimeNpcs()) {
      const isNearby = this.currentNearby?.id === `npc:${runtime.entity.id}`;
      drawList.push({
        sortY: runtime.py,
        draw: () =>
          drawCharacter(
            ctx,
            runtime.entity.spriteKey,
            Math.round(runtime.px),
            Math.round(runtime.py),
            runtime.facing,
            runtime.walkPhase,
            runtime.animState,
            isNearby,
            this.elapsed,
            runtime.emote
          ),
      });
    }

    drawList.push({
      sortY: this.playerY,
      draw: () =>
        drawCharacter(
          ctx,
          'player',
          Math.round(this.playerX),
          Math.round(this.playerY),
          this.facing,
          this.walkPhase,
          this.playerAnimState,
          false,
          this.elapsed
        ),
    });

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawList) item.draw();

    // 4. Optional hand-drawn overhead foreground layer (roof eaves, canopies) & seasonal overlay
    const fgImg = spriteManager.getImage(this.map.layers?.foreground);
    if (fgImg) {
      ctx.drawImage(fgImg, 0, 0, worldW, worldH);
    }
    const seasonOverlay = spriteManager.getImage(this.season.mapOverlay);
    if (seasonOverlay) {
      ctx.drawImage(seasonOverlay, 0, 0, worldW, worldH);
    }

    // 5. Dynamic Day/Night Photoshop-style Multiply Lightmap (skipped if artist supplied hand-lit map!)
    const skipSyntheticDarkening = hasCustomNight || hasCustomSunset;
    this.renderDynamicLighting(ctx, ts, worldW, worldH, skipSyntheticDarkening);

    // 6. Seasonal particles (fireflies fade out cleanly in bright daylight)
    this.renderParticles(ctx);

    ctx.restore();
  }

  private collectLights(ts: number): Array<{
    x: number;
    y: number;
    r: number;
    color: string;
    activeWeight: number;
  }> {
    const nightWeight = this.timeState.lightIntensity;
    const lights: Array<{ x: number; y: number; r: number; color: string; activeWeight: number }> = [];
    if (nightWeight <= 0.04) return lights;

    for (const prop of this.getAllProps()) {
      if (prop.kind === 'art_frame') {
        lights.push({
          x: prop.x * ts + 8,
          y: prop.y * ts + 14,
          r: 26,
          color: this.season.spotlightColor,
          activeWeight: nightWeight,
        });
      } else if (prop.kind === 'lamp_post' || prop.kind === 'lantern') {
        const flicker = 1 + Math.sin(this.elapsed * 5.2 + prop.x * 3) * 0.05;
        lights.push({
          x: prop.x * ts + 8,
          y: prop.y * ts + 6,
          r: (prop.light?.radius || 46) * flicker,
          color: prop.light?.color || this.season.spotlightColor,
          activeWeight: nightWeight,
        });
      } else if (prop.light) {
        const flicker = prop.light.flicker ? 1 + Math.sin(this.elapsed * 5 + prop.x) * 0.05 : 1;
        lights.push({
          x: prop.x * ts + ((prop.w || 1) * ts) / 2,
          y: prop.y * ts + ((prop.h || 1) * ts) / 2,
          r: prop.light.radius * flicker,
          color: prop.light.color || this.season.spotlightColor,
          activeWeight: nightWeight,
        });
      }
    }

    for (const ml of this.map.lights || []) {
      const flicker = ml.flicker ? 1 + Math.sin(this.elapsed * 5 + ml.x) * 0.05 : 1;
      lights.push({
        x: ml.x * ts,
        y: ml.y * ts,
        r: (ml.radius + 8) * flicker,
        color: ml.color || this.season.spotlightColor,
        activeWeight: nightWeight,
      });
    }

    return lights;
  }

  private blendToWhite(c: { r: number; g: number; b: number; a: number }): string {
    // Interpolate between pure white (neutral in multiply mode) and target tint by alpha strength
    const r = Math.round(255 + (c.r - 255) * c.a);
    const g = Math.round(255 + (c.g - 255) * c.a);
    const b = Math.round(255 + (c.b - 255) * c.a);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private renderDynamicLighting(
    ctx: CanvasRenderingContext2D,
    ts: number,
    worldW: number,
    worldH: number,
    skipSyntheticDarkening: boolean
  ): void {
    const lights = this.collectLights(ts);
    const { outdoorTint, indoorTint } = this.timeState;

    // 1. Photoshop-style Multiply Lightmap:
    // Pure daytime (outdoorTint.a === 0) renders 0 overlays -> 100% crisp, zero haze!
    if (!skipSyntheticDarkening && this.lightCtx && outdoorTint.a > 0.01) {
      const lctx = this.lightCtx;
      lctx.globalCompositeOperation = 'source-over';

      // Fill outdoor ambient multiply color (white = untouched, indigo = moonlit night)
      lctx.fillStyle = this.blendToWhite(outdoorTint);
      lctx.fillRect(0, 0, worldW, worldH);

      // Indoor rooms stay noticeably warmer & brighter than the night courtyard
      lctx.fillStyle = this.blendToWhite(indoorTint);
      for (const rect of this.map.indoorRects || []) {
        lctx.fillRect(rect.x * ts, rect.y * ts, rect.w * ts, rect.h * ts);
      }

      // Paint bright warm-white light pools on the lightmap using 'lighten' so lamps
      // restore full crisp brightness & warm hue right where they shine!
      lctx.globalCompositeOperation = 'lighten';
      for (const l of lights) {
        if (l.activeWeight <= 0.05) continue;
        const grad = lctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
        grad.addColorStop(0, `rgba(255, 244, 214, ${Math.min(1, l.activeWeight).toFixed(2)})`);
        grad.addColorStop(0.55, `rgba(255, 224, 165, ${(0.55 * l.activeWeight).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lctx.fillStyle = grad;
        lctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.lightCanvas, 0, 0);
      ctx.restore();
    }

    // 2. Subtle warm golden glow halos at night (soft 'screen' tint so colors stay vivid, never milky)
    if (lights.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const l of lights) {
        if (l.activeWeight <= 0.12) continue;
        const alpha = 0.24 * l.activeWeight;
        const grad = ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r * 0.72);
        grad.addColorStop(0, `rgba(255, 207, 92, ${alpha.toFixed(2)})`);
        grad.addColorStop(1, 'rgba(255, 207, 92, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      ctx.restore();
    }

    // 3. Optional hand-painted night lamp glow overlay from Photoshop (transparent PNG)
    const nightOverlay = spriteManager.getImage(this.map.layers?.nightOverlay);
    if (nightOverlay && this.timeState.lightIntensity > 0.1) {
      ctx.save();
      ctx.globalAlpha = this.timeState.lightIntensity;
      ctx.drawImage(nightOverlay, 0, 0, worldW, worldH);
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const isFireflies = this.season.particleType === 'fireflies';
    const visibility = isFireflies ? this.timeState.fireflyAlpha : 1;
    if (visibility <= 0.04) return;

    for (const p of this.particles) {
      const alpha = (0.45 + 0.45 * Math.sin(p.phase)) * visibility;
      if (this.season.particleType === 'fireflies') {
        ctx.fillStyle = `rgba(255, 214, 92, ${alpha.toFixed(2)})`;
      } else if (this.season.particleType === 'lanterns') {
        ctx.fillStyle = `rgba(255, 148, 66, ${alpha.toFixed(2)})`;
      } else if (this.season.particleType === 'petals') {
        ctx.fillStyle = `rgba(255, 220, 74, ${alpha.toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(245, 245, 255, ${alpha.toFixed(2)})`;
      }
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
}
