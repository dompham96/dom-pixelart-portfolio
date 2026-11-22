import type { Direction } from '../../types/content';

export interface SpriteAnimClip {
  row: number;
  frames: number;
  frameDurationsMs: number[];
  loop?: boolean;
}

export interface SpriteSheetMeta {
  id: string;
  imageSrc: string;
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
  mirrorRightToLeft?: boolean;
  clips: Record<string, SpriteAnimClip>;
}

export interface SpriteManifest {
  version: number;
  sprites: Record<string, SpriteSheetMeta>;
}

/**
 * Pure frame index calculation preserving exact per-frame durations imported from GIF/WebP.
 */
export function resolveFrameIndex(clip: SpriteAnimClip, elapsedMs: number): number {
  const count = Math.max(1, clip.frames);
  if (count === 1) return 0;

  const durations =
    clip.frameDurationsMs && clip.frameDurationsMs.length === count
      ? clip.frameDurationsMs
      : Array.from({ length: count }, () => 150);

  const total = durations.reduce((sum, d) => sum + Math.max(16, d), 0);
  if (total <= 0) return 0;

  const loop = clip.loop !== false;
  const t = loop ? ((elapsedMs % total) + total) % total : Math.min(elapsedMs, total - 1);

  let acc = 0;
  for (let i = 0; i < count; i++) {
    acc += Math.max(16, durations[i]);
    if (t < acc) return i;
  }
  return count - 1;
}

/**
 * Resolves the best matching animation clip & whether horizontal mirroring should be applied.
 * Artists only need to draw 3 directions (down, up, right); left is auto-mirrored from right.
 */
export function resolveClipAndFlip(
  meta: SpriteSheetMeta,
  state: string,
  facing: Direction
): { clipName: string; clip: SpriteAnimClip; flipX: boolean } | null {
  const allowMirror = meta.mirrorRightToLeft !== false;
  const tryLookup = (name: string, flipX = false) => {
    const clip = meta.clips[name];
    return clip ? { clipName: name, clip, flipX } : null;
  };

  // 1. Exact state + direction
  const exact = tryLookup(`${state}_${facing}`);
  if (exact) return exact;

  // 2. Auto-mirror left <-> right
  if (allowMirror && facing === 'left') {
    const mirrored = tryLookup(`${state}_right`, true);
    if (mirrored) return mirrored;
  }
  if (allowMirror && facing === 'right') {
    const mirrored = tryLookup(`${state}_left`, true);
    if (mirrored) return mirrored;
  }

  // 3. Single-direction state clip (e.g. "sleep", "default", "sway")
  const directState = tryLookup(state) || tryLookup(`${state}_down`);
  if (directState) return directState;

  // 4. Fallback to idle in same direction / mirrored / default
  const idleExact = tryLookup(`idle_${facing}`);
  if (idleExact) return idleExact;
  if (allowMirror && facing === 'left') {
    const idleMirrored = tryLookup('idle_right', true);
    if (idleMirrored) return idleMirrored;
  }

  return tryLookup('idle_down') || tryLookup('idle') || tryLookup('default');
}

/**
 * Lightweight, non-blocking sprite sheet & map-layer image loader for Canvas 2D.
 * Gracefully falls back when no custom Photoshop PNGs have been dropped in yet.
 */
class SpriteManager {
  private manifestLoaded = false;
  private sprites: Record<string, SpriteSheetMeta> = {};
  private images = new Map<string, HTMLImageElement | 'loading' | 'failed'>();

  public init(): void {
    if (this.manifestLoaded || typeof window === 'undefined') return;
    this.manifestLoaded = true;

    const base = import.meta.env?.BASE_URL || '/';
    const manifestUrl = `${base}assets/game/sprites/manifest.json`;

    void fetch(manifestUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SpriteManifest | null) => {
        if (!data || !data.sprites) return;
        this.sprites = data.sprites;
        for (const meta of Object.values(this.sprites)) {
          this.preloadImage(meta.imageSrc);
        }
      })
      .catch(() => {
        // Silent fallback to procedural pixel art renderer
      });
  }

  public preloadImage(relativePath?: string): void {
    if (!relativePath || typeof window === 'undefined') return;
    if (this.images.has(relativePath)) return;

    this.images.set(relativePath, 'loading');
    const base = import.meta.env?.BASE_URL || '/';
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.images.set(relativePath, img);
    };
    img.onerror = () => {
      this.images.set(relativePath, 'failed');
    };
    img.src = relativePath.startsWith('http') || relativePath.startsWith('/')
      ? relativePath
      : `${base}${relativePath}`;
  }

  public getImage(relativePath?: string): HTMLImageElement | null {
    if (!relativePath) return null;
    const entry = this.images.get(relativePath);
    if (!entry) {
      this.preloadImage(relativePath);
      return null;
    }
    if (entry === 'loading' || entry === 'failed') return null;
    return entry;
  }

  public hasSprite(spriteId: string): boolean {
    const meta = this.sprites[spriteId];
    if (!meta) return false;
    return this.getImage(meta.imageSrc) !== null;
  }

  /**
   * Draws an animated sprite sheet frame anchored to world (footX, footY).
   * Returns true if drawn, false if procedural fallback should render instead.
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteId: string,
    state: string,
    facing: Direction,
    elapsedMs: number,
    footX: number,
    footY: number
  ): boolean {
    const meta = this.sprites[spriteId];
    if (!meta) return false;

    const img = this.getImage(meta.imageSrc);
    if (!img) return false;

    const resolved = resolveClipAndFlip(meta, state, facing);
    if (!resolved) return false;

    const frameIdx = resolveFrameIndex(resolved.clip, elapsedMs);
    const sx = frameIdx * meta.frameWidth;
    const sy = resolved.clip.row * meta.frameHeight;

    const drawX = Math.round(footX - meta.frameWidth * meta.anchorX);
    const drawY = Math.round(footY - meta.frameHeight * meta.anchorY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (resolved.flipX) {
      ctx.translate(drawX + meta.frameWidth, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        img,
        sx,
        sy,
        meta.frameWidth,
        meta.frameHeight,
        0,
        0,
        meta.frameWidth,
        meta.frameHeight
      );
    } else {
      ctx.drawImage(
        img,
        sx,
        sy,
        meta.frameWidth,
        meta.frameHeight,
        drawX,
        drawY,
        meta.frameWidth,
        meta.frameHeight
      );
    }
    ctx.restore();
    return true;
  }
}

export const spriteManager = new SpriteManager();
