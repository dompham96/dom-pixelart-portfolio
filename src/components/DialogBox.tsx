import { useEffect, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import type { Locale, LocalizedText } from '../types/content';
import { soundEngine } from '../audio/SoundEngine';

export interface ActiveDialog {
  speaker: LocalizedText;
  portrait: string;
  lines: LocalizedText[];
  actionButton?: {
    label: LocalizedText;
    onClick: () => void;
  };
}

interface DialogBoxProps {
  dialog: ActiveDialog;
  locale: Locale;
  onClose: () => void;
}

const PORTRAIT_BADGE: Record<string, { bg: string; label: string }> = {
  dom: { bg: '#FFCF3D', label: 'DOM' },
  ink_cat: { bg: '#F472B6', label: 'INK' },
  task_snake: { bg: '#7ED957', label: 'SNAKE' },
};

export function DialogBox({ dialog, locale, onClose }: DialogBoxProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  const currentText = dialog.lines[lineIndex]?.[locale] ?? '';
  const isTyping = visibleChars < currentText.length;
  const isLastLine = lineIndex >= dialog.lines.length - 1;

  useEffect(() => {
    setLineIndex(0);
    setVisibleChars(0);
  }, [dialog]);

  useEffect(() => {
    setVisibleChars(0);
  }, [lineIndex, locale]);

  useEffect(() => {
    if (visibleChars >= currentText.length) return;
    const timer = window.setTimeout(() => {
      setVisibleChars((c) => {
        const next = Math.min(currentText.length, c + 2);
        if (next % 6 === 0) soundEngine.playBlip();
        return next;
      });
    }, 18);
    return () => window.clearTimeout(timer);
  }, [visibleChars, currentText]);

  const advance = () => {
    if (isTyping) {
      setVisibleChars(currentText.length);
      return;
    }
    if (!isLastLine) {
      setLineIndex((i) => i + 1);
      soundEngine.playBlip();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        advance();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const badge = PORTRAIT_BADGE[dialog.portrait] || { bg: '#FFCF3D', label: 'NPC' };

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-40 mx-auto w-full max-w-2xl px-3 sm:bottom-6 sm:px-4"
      role="dialog"
      aria-live="polite"
    >
      <div className="pixel-panel relative p-4 sm:p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-[#A89F91] hover:text-[#FFCF3D]"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* Pixel Avatar Portrait */}
          <div
            className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border-2 border-[#3B3630] bg-[#131211] sm:h-14 sm:w-14"
            aria-hidden="true"
          >
            <div className="h-4 w-4" style={{ backgroundColor: badge.bg }} />
            <span className="font-pixel mt-1 text-[10px] text-[#A89F91]">{badge.label}</span>
          </div>

          <div className="min-w-0 flex-1 pr-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-pixel text-sm font-bold text-[#FFCF3D] sm:text-base">
                {dialog.speaker[locale]}
              </span>
              <span className="font-mono-code text-[10px] text-[#A89F91]">
                {lineIndex + 1}/{dialog.lines.length}
              </span>
            </div>

            <p
              onClick={advance}
              className="min-h-[3.2rem] cursor-pointer text-sm leading-relaxed text-[#F5EFE6] sm:text-base"
            >
              {currentText.slice(0, visibleChars)}
              {isTyping && <span className="ml-0.5 inline-block h-3.5 w-1.5 bg-[#FFCF3D]" />}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {dialog.actionButton ? (
                <button
                  type="button"
                  onClick={() => {
                    dialog.actionButton?.onClick();
                    onClose();
                  }}
                  className="pixel-btn pixel-btn-primary px-3 py-1.5 text-xs font-bold sm:text-sm"
                >
                  {dialog.actionButton.label[locale]}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={advance}
                className="pixel-btn flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm"
              >
                <span>
                  {isTyping
                    ? locale === 'vi'
                      ? 'Hiện hết'
                      : 'Skip'
                    : isLastLine
                      ? locale === 'vi'
                        ? 'Đóng'
                        : 'Close'
                      : locale === 'vi'
                        ? 'Tiếp'
                        : 'Next'}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
