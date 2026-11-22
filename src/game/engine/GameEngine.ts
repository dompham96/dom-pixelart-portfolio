import type {
  Direction,
  LocalizedText,
  MapDefinition,
  MapProp,
  NpcEntity,
  SeasonConfig,
} from '../../types/content';
import { drawCharacter, drawProp, drawTile } from '../sprites/pixelRenderer';
import { findPath, type GridPoint } from './Pathfinder';
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

const SOLID_TILES = new Set(['.', 'T', 'I', 'W', 'N']);

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapDefinition;
  private season: SeasonConfig;
  private onInteract: (event: InteractionEvent) => void;
  private onNearbyChange: (prompt: NearbyPrompt | null) => void;

  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private paused = false;

  // Player state in world pixel coords (1 tile = map.tileSize = 16px)
  private playerX: number;
  private playerY: number;
  private facing: Direction;
  private walkPhase = 0;
  private stepSoundCooldown = 0;

  // Input state
  private keys = new Set<string>();
  private virtualDir: Direction | null = null;
  private path: GridPoint[] = [];
  private pendingInteraction: InteractionEvent | null = null;
  private tapMarker: { x: number; y: number; ttl: number } | null = null;

  // Camera state
  private camX = 0;
  private camY = 0;
  private scale = 3;

  // Particles
  private particles: Particle[] = [];

  // Nearby tracking
  private lastNearbyId: string | null = null;
  private currentNearby: { id: string; event: InteractionEvent; label: LocalizedText } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    map: MapDefinition,
    season: SeasonConfig,
    onInteract: (event: InteractionEvent) => void,
    onNearbyChange: (prompt: NearbyPrompt | null) => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas context unavailable');
    this.ctx = ctx;
    this.map = map;
    this.season = season;
    this.onInteract = onInteract;
    this.onNearbyChange = onNearbyChange;

    this.playerX = map.spawn.x * map.tileSize;
    this.playerY = map.spawn.y * map.tileSize;
    this.facing = map.spawn.facing;

    this.initParticles();
    this.resize();
    this.snapCamera();
    this.start();
  }

  private getAllProps(): MapProp[] {
    return [...this.map.props, ...this.season.extraProps];
  }

  public setSeason(season: SeasonConfig): void {
    this.season = season;
    this.initParticles();
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

  public handleKeyDown(code: string): void {
    if (this.paused) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
      this.keys.add(code);
      this.path = [];
      this.pendingInteraction = null;
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

    // Crisp integer pixel zoom adapted for mobile portrait & desktop landscape
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

  private isTileBlocked(tx: number, ty: number): boolean {
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

    for (const npc of this.map.npcs) {
      if (npc.x === tx && npc.y === ty) return true;
    }

    return false;
  }

  private isRectBlocked(px: number, py: number): boolean {
    const ts = this.map.tileSize;
    // Forgiving inner hitbox so walking through doorways feels buttery smooth
    const left = Math.floor((px + 3) / ts);
    const right = Math.floor((px + ts - 4) / ts);
    const top = Math.floor((py + 6) / ts);
    const bottom = Math.floor((py + ts - 2) / ts);

    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (this.isTileBlocked(tx, ty)) return true;
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
    const tx = Math.floor(worldX / this.map.tileSize);
    const ty = Math.floor(worldY / this.map.tileSize);

    if (tx < 0 || ty < 0 || tx >= this.map.width || ty >= this.map.height) return;

    this.tapMarker = {
      x: tx * this.map.tileSize + this.map.tileSize / 2,
      y: ty * this.map.tileSize + this.map.tileSize / 2,
      ttl: 0.45,
    };

    // Did the visitor tap an NPC or interactable prop?
    let tappedEvent: InteractionEvent | null = null;
    const npc = this.map.npcs.find((n) => n.x === tx && n.y === ty);
    if (npc) {
      tappedEvent = {
        kind: 'npc',
        npc,
        dialogue: this.season.npcDialogueOverrides[npc.id] || npc.dialogue,
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
      x: Math.round(this.playerX / this.map.tileSize),
      y: Math.round(this.playerY / this.map.tileSize),
    };

    // If already adjacent to the tapped interactable, trigger immediately!
    if (tappedEvent && Math.abs(startTile.x - tx) + Math.abs(startTile.y - ty) <= 1) {
      this.path = [];
      this.pendingInteraction = null;
      soundEngine.playChime();
      this.onInteract(tappedEvent);
      return;
    }

    const path = findPath(
      startTile,
      { x: tx, y: ty },
      this.map.width,
      this.map.height,
      (x, y) => this.isTileBlocked(x, y),
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

  private update(dt: number): void {
    this.elapsed += dt;
    this.updateParticles(dt);

    if (this.tapMarker) {
      this.tapMarker.ttl -= dt;
      if (this.tapMarker.ttl <= 0) this.tapMarker = null;
    }

    if (this.paused) return;

    const speed = 64; // 4 tiles/sec
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

    if (isMoving) {
      this.walkPhase += dt;
      this.stepSoundCooldown -= dt;
      if (this.stepSoundCooldown <= 0) {
        soundEngine.playStep();
        this.stepSoundCooldown = 0.28;
      }
    } else {
      this.walkPhase = 0;
    }

    this.updateCamera(dt);
    this.updateNearbyInteractable();
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
    const maxDist = ts * 1.65;

    for (const npc of this.map.npcs) {
      const dist = Math.hypot(npc.x * ts + ts / 2 - pCx, npc.y * ts + ts / 2 - pCy);
      if (dist <= maxDist && (!best || dist < best.dist)) {
        best = {
          id: `npc:${npc.id}`,
          dist,
          event: {
            kind: 'npc',
            npc,
            dialogue: this.season.npcDialogueOverrides[npc.id] || npc.dialogue,
          },
          label: npc.name,
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

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.season.skyColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.scale, this.scale);
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));

    // 1. Base tiles
    for (let y = 0; y < this.map.height; y++) {
      const row = this.map.tiles[y];
      for (let x = 0; x < this.map.width; x++) {
        drawTile(ctx, row[x], x * ts, y * ts, ts);
      }
    }

    // 2. Tap destination indicator
    if (this.tapMarker) {
      ctx.strokeStyle = 'rgba(255, 207, 61, 0.8)';
      ctx.lineWidth = 1;
      const r = 3 + (0.45 - this.tapMarker.ttl) * 8;
      ctx.strokeRect(
        Math.round(this.tapMarker.x - r / 2),
        Math.round(this.tapMarker.y - r / 2),
        Math.round(r),
        Math.round(r)
      );
    }

    // 3. Y-sorted props, NPCs, and Player for natural top-down depth
    type RenderItem = { sortY: number; draw: () => void };
    const drawList: RenderItem[] = [];

    for (const prop of this.getAllProps()) {
      const isNearby = this.currentNearby?.id === `prop:${prop.id}`;
      drawList.push({
        sortY: prop.y * ts + (prop.kind === 'art_frame' ? -2 : 0),
        draw: () => drawProp(ctx, prop, ts, this.elapsed, isNearby),
      });
    }

    for (const npc of this.map.npcs) {
      const isNearby = this.currentNearby?.id === `npc:${npc.id}`;
      drawList.push({
        sortY: npc.y * ts,
        draw: () =>
          drawCharacter(
            ctx,
            npc.spriteKey,
            npc.x * ts,
            npc.y * ts,
            npc.facing,
            0,
            false,
            isNearby,
            this.elapsed
          ),
      });
    }

    const isMoving =
      this.path.length > 0 ||
      this.virtualDir !== null ||
      this.keys.size > 0;

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
          isMoving,
          false,
          this.elapsed
        ),
    });

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawList) item.draw();

    // 4. Warm gallery spotlights & streetlamp pools
    this.renderLighting(ctx, ts);

    // 5. Seasonal particles
    this.renderParticles(ctx);

    ctx.restore();

    // 6. Subtle seasonal ambient tint
    ctx.fillStyle = this.season.ambientOverlay;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderLighting(ctx: CanvasRenderingContext2D, ts: number): void {
    const lights: Array<{ x: number; y: number; r: number }> = [];
    for (const prop of this.getAllProps()) {
      if (prop.kind === 'art_frame') {
        lights.push({ x: prop.x * ts + 8, y: prop.y * ts + 14, r: 22 });
      } else if (prop.kind === 'lamp_post' || prop.kind === 'lantern') {
        lights.push({ x: prop.x * ts + 8, y: prop.y * ts + 6, r: 34 });
      }
    }
    // Warm indoor doorway spill
    lights.push({ x: 12 * ts, y: 12.5 * ts, r: 28 });

    for (const l of lights) {
      const grad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      grad.addColorStop(0, this.season.spotlightColor);
      grad.addColorStop(1, 'rgba(255, 207, 61, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = 0.45 + 0.45 * Math.sin(p.phase);
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
