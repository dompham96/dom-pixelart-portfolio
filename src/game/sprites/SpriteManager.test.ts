import { describe, expect, it } from 'vitest';
import { resolveClipAndFlip, resolveFrameIndex, type SpriteSheetMeta } from './SpriteManager';

describe('SpriteManager helpers', () => {
  it('respects exact per-frame GIF/WebP durations when advancing frames', () => {
    const clip = { row: 0, frames: 3, frameDurationsMs: [100, 250, 150], loop: true };
    expect(resolveFrameIndex(clip, 0)).toBe(0);
    expect(resolveFrameIndex(clip, 99)).toBe(0);
    expect(resolveFrameIndex(clip, 100)).toBe(1);
    expect(resolveFrameIndex(clip, 349)).toBe(1);
    expect(resolveFrameIndex(clip, 350)).toBe(2);
    expect(resolveFrameIndex(clip, 500)).toBe(0); // loops at 500ms total
  });

  it('auto-mirrors right clips when facing left so artists only draw 3 directions', () => {
    const meta: SpriteSheetMeta = {
      id: 'player',
      imageSrc: 'assets/game/sprites/player.png',
      frameWidth: 16,
      frameHeight: 24,
      anchorX: 0.5,
      anchorY: 1.0,
      mirrorRightToLeft: true,
      clips: {
        idle_down: { row: 0, frames: 2, frameDurationsMs: [200, 200] },
        run_right: { row: 1, frames: 4, frameDurationsMs: [90, 90, 90, 90] },
      },
    };

    const leftRun = resolveClipAndFlip(meta, 'run', 'left');
    expect(leftRun).not.toBeNull();
    expect(leftRun!.clipName).toBe('run_right');
    expect(leftRun!.flipX).toBe(true);

    const rightRun = resolveClipAndFlip(meta, 'run', 'right');
    expect(rightRun!.clipName).toBe('run_right');
    expect(rightRun!.flipX).toBe(false);

    // Missing walk_down falls back gracefully to idle_down
    const walkFallback = resolveClipAndFlip(meta, 'walk', 'down');
    expect(walkFallback!.clipName).toBe('idle_down');
    expect(walkFallback!.flipX).toBe(false);
  });
});
