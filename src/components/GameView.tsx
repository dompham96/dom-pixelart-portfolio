import { useEffect, useRef, useState } from 'react';
import type { Direction, Locale, MapZone, SeasonConfig, TimeOfDayMode } from '../types/content';
import type { TimeOfDayState } from '../game/engine/TimeOfDay';
import { domHouseMap } from '../data';
import { GameEngine, type InteractionEvent, type NearbyPrompt } from '../game/engine/GameEngine';
import { MobileControls } from './MobileControls';

interface GameViewProps {
  locale: Locale;
  season: SeasonConfig;
  timeMode: TimeOfDayMode;
  paused: boolean;
  showDpad: boolean;
  onInteract: (event: InteractionEvent) => void;
  onTimeStateChange: (state: TimeOfDayState) => void;
}

export function GameView({
  locale,
  season,
  timeMode,
  paused,
  showDpad,
  onInteract,
  onTimeStateChange,
}: GameViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const interactRef = useRef(onInteract);
  const timeStateCbRef = useRef(onTimeStateChange);
  interactRef.current = onInteract;
  timeStateCbRef.current = onTimeStateChange;

  const [nearby, setNearby] = useState<NearbyPrompt | null>(null);
  const [currentZone, setCurrentZone] = useState<MapZone | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(
      canvas,
      domHouseMap,
      season,
      timeMode,
      (ev) => interactRef.current(ev),
      (prompt) => setNearby(prompt),
      (zone) => setCurrentZone(zone),
      (state) => timeStateCbRef.current(state)
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
    engineRef.current?.setTimeMode(timeMode);
  }, [timeMode]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  const handleDirectionChange = (dir: Direction | null) => {
    engineRef.current?.setVirtualDirection(dir);
  };

  const handleToggleRun = () => {
    setIsRunning((prev) => {
      const next = !prev;
      engineRef.current?.setVirtualRun(next);
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    engineRef.current?.handlePointerTap(e.clientX, e.clientY);
  };

  const zoneTitle = currentZone ? currentZone.name[locale] : domHouseMap.name[locale];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#131211] pt-12">
      {/* Subtle top-left zone & controls helper pill on desktop */}
      <div className="pointer-events-none fixed left-3 top-14 z-10 hidden border border-[#3B3630] bg-[#131211]/85 px-2.5 py-1 text-[11px] text-[#A89F91] sm:block">
        <span className="font-pixel text-[#FFCF3D]">{zoneTitle}</span>
        <span className="mx-1.5 text-[#3B3630]">|</span>
        <span>
          {locale === 'vi'
            ? 'WASD / Mũi tên • Giữ Shift để chạy • Click tranh & NPC'
            : 'WASD / Arrows • Hold Shift to run • Click art & NPC'}
        </span>
      </div>

      {/* Compact mobile zone & tip */}
      <div className="pointer-events-none fixed left-1/2 top-16 z-10 -translate-x-1/2 whitespace-nowrap border border-[#3B3630] bg-[#131211]/85 px-2.5 py-1 text-[11px] text-[#A89F91] sm:hidden">
        <span className="font-pixel text-[#FFCF3D]">{zoneTitle}</span>
        <span className="mx-1 text-[#3B3630]">•</span>
        <span>{locale === 'vi' ? 'Chạm sàn để đi' : 'Tap to walk'}</span>
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
          isRunning={isRunning}
          nearby={nearby}
          onDirectionChange={handleDirectionChange}
          onToggleRun={handleToggleRun}
          onInteract={() => engineRef.current?.triggerInteract()}
        />
      )}
    </div>
  );
}
