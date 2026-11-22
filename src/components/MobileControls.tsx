import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import type { Direction, Locale } from '../types/content';
import type { NearbyPrompt } from '../game/engine/GameEngine';

interface MobileControlsProps {
  locale: Locale;
  showDpad: boolean;
  nearby: NearbyPrompt | null;
  onDirectionChange: (dir: Direction | null) => void;
  onInteract: () => void;
}

export function MobileControls({
  locale,
  showDpad,
  nearby,
  onDirectionChange,
  onInteract,
}: MobileControlsProps) {
  const bindHold = (dir: Direction) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onDirectionChange(dir);
    },
    onPointerUp: () => onDirectionChange(null),
    onPointerLeave: () => onDirectionChange(null),
    onPointerCancel: () => onDirectionChange(null),
  });

  return (
    <>
      {/* Contextual interaction pill centered near bottom when standing next to frame/NPC */}
      {nearby && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
          <button
            id="btn-context-interact"
            type="button"
            onClick={onInteract}
            className="pixel-btn pixel-btn-primary pointer-events-auto flex items-center gap-2 px-4 py-2.5 text-sm font-bold sm:text-base"
          >
            <Hand className="h-4 w-4" />
            <span>
              {nearby.label[locale]}
            </span>
            <span className="font-mono-code hidden border border-[#131211]/40 px-1.5 py-0.5 text-[10px] sm:inline">
              E
            </span>
          </button>
        </div>
      )}

      {/* Optional Virtual D-Pad + Interact A Button */}
      {showDpad && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex items-end justify-between px-4 sm:bottom-6 sm:px-8">
          {/* Classic Cross D-Pad */}
          <div className="pointer-events-auto grid grid-cols-3 gap-1.5 select-none">
            <div />
            <button
              type="button"
              aria-label="Move Up"
              className="pixel-btn flex h-12 w-12 items-center justify-center bg-[#1C1B19]/90"
              {...bindHold('up')}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <div />
            <button
              type="button"
              aria-label="Move Left"
              className="pixel-btn flex h-12 w-12 items-center justify-center bg-[#1C1B19]/90"
              {...bindHold('left')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center border-2 border-[#3B3630] bg-[#131211]/80">
              <div className="h-2.5 w-2.5 bg-[#3B3630]" />
            </div>
            <button
              type="button"
              aria-label="Move Right"
              className="pixel-btn flex h-12 w-12 items-center justify-center bg-[#1C1B19]/90"
              {...bindHold('right')}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div />
            <button
              type="button"
              aria-label="Move Down"
              className="pixel-btn flex h-12 w-12 items-center justify-center bg-[#1C1B19]/90"
              {...bindHold('down')}
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <div />
          </div>

          {/* Action Button A */}
          <button
            type="button"
            onClick={onInteract}
            disabled={!nearby}
            className={`pixel-btn pointer-events-auto flex h-16 w-16 flex-col items-center justify-center text-sm font-bold ${
              nearby ? 'pixel-btn-primary' : 'opacity-45'
            }`}
            aria-label="Interact"
          >
            <span>A</span>
            <span className="text-[10px]">{locale === 'vi' ? 'XEM' : 'ACT'}</span>
          </button>
        </div>
      )}
    </>
  );
}
