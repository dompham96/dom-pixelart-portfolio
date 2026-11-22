import { useEffect, useRef, useState } from 'react';
import type { Direction, Locale, SeasonConfig } from '../types/content';
import { domHouseMap } from '../data';
import { GameEngine, type InteractionEvent, type NearbyPrompt } from '../game/engine/GameEngine';
import { MobileControls } from './MobileControls';

interface GameViewProps {
  locale: Locale;
  season: SeasonConfig;
  paused: boolean;
  showDpad: boolean;
  onInteract: (event: InteractionEvent) => void;
}

export function GameView({ locale, season, paused, showDpad, onInteract }: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;

  const [nearby, setNearby] = useState<NearbyPrompt | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      domHouseMap,
      season,
      (ev) => interactRef.current(ev),
      (prompt) => setNearby(prompt)
    );
    engineRef.current = engine;

    const onResize = () => engine.resize();
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      engine.handleKeyDown(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e.code);

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSeason(season);
  }, [season]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  const handleDirectionChange = (dir: Direction | null) => {
    engineRef.current?.setVirtualDirection(dir);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    engineRef.current?.handlePointerTap(e.clientX, e.clientY);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#131211] pt-12">
      {/* Subtle bottom-left helper pill on desktop */}
      <div className="pointer-events-none fixed left-3 top-14 z-10 hidden border border-[#3B3630] bg-[#131211]/85 px-2.5 py-1 text-[11px] text-[#A89F91] sm:block">
        <span className="font-pixel text-[#FFCF3D]">{domHouseMap.name[locale]}</span>
        <span className="mx-1.5 text-[#3B3630]">|</span>
        <span>
          {locale === 'vi'
            ? 'WASD / Mũi tên hoặc Click vào tranh & NPC để di chuyển'
            : 'WASD / Arrows or Click any frame & NPC to walk'}
        </span>
      </div>

      {/* Compact mobile tip */}
      <div className="pointer-events-none fixed left-1/2 top-16 z-10 -translate-x-1/2 whitespace-nowrap border border-[#3B3630] bg-[#131211]/85 px-2.5 py-1 text-[11px] text-[#A89F91] sm:hidden">
        {locale === 'vi' ? 'Chạm sàn để đi • Chạm tranh/NPC để xem' : 'Tap floor to walk • Tap art/NPC'}
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="pixelated block h-full w-full cursor-pointer touch-none"
      />

      {!paused && (
        <MobileControls
          locale={locale}
          showDpad={showDpad}
          nearby={nearby}
          onDirectionChange={handleDirectionChange}
          onInteract={() => engineRef.current?.triggerInteract()}
        />
      )}
    </div>
  );
}
