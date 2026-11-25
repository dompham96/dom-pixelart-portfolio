import { useEffect, useRef } from 'react';
import type { CharacterAnimState, CharacterAppearance, Facing8 } from '../types/content';
import {
  drawBaseCharacterSprite,
  preloadBaseCharacterSheets,
} from '../game/sprites/baseCharacterRenderer';

export interface CharacterPreviewCanvasProps {
  appearance: CharacterAppearance;
  anim?: CharacterAnimState;
  facing?: Facing8;
  scale?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function CharacterPreviewCanvas({
  appearance,
  anim = 'idle',
  facing = 'down',
  scale = 3,
  width = 96,
  height = 112,
  className = '',
}: CharacterPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ appearance, anim, facing, scale });
  stateRef.current = { appearance, anim, facing, scale };

  useEffect(() => {
    void preloadBaseCharacterSheets();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const render = (now: number) => {
      const t = now / 1000;
      const {
        appearance: curAppearance,
        anim: curAnim,
        facing: curFacing,
        scale: curScale,
      } = stateRef.current;

      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      drawBaseCharacterSprite(
        ctx,
        curAppearance,
        curAnim,
        curFacing,
        t,
        width / 2,
        height - 6,
        curScale
      );

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pixelated block ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
