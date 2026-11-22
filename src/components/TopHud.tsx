import {
  Gamepad2,
  Grid2x2,
  ShoppingBag,
  User,
  Mail,
  Volume2,
  VolumeX,
  Home,
  Sparkles,
} from 'lucide-react';
import type { Locale, SeasonConfig, SeasonId } from '../types/content';
import { seasonList } from '../data';

export type AppMode = 'title' | 'game' | 'gallery';

interface TopHudProps {
  mode: AppMode;
  locale: Locale;
  season: SeasonConfig;
  audioEnabled: boolean;
  showDpad: boolean;
  onChangeMode: (mode: AppMode) => void;
  onOpenMerch: () => void;
  onOpenAbout: () => void;
  onOpenContact: () => void;
  onToggleLocale: () => void;
  onToggleAudio: () => void;
  onToggleDpad: () => void;
  onChangeSeason: (id: SeasonId) => void;
}

export function TopHud({
  mode,
  locale,
  season,
  audioEnabled,
  showDpad,
  onChangeMode,
  onOpenMerch,
  onOpenAbout,
  onOpenContact,
  onToggleLocale,
  onToggleAudio,
  onToggleDpad,
  onChangeSeason,
}: TopHudProps) {
  const nextSeason = () => {
    const idx = seasonList.findIndex((s) => s.id === season.id);
    const next = seasonList[(idx + 1) % seasonList.length];
    onChangeSeason(next.id);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b-2 border-[#3B3630] bg-[#131211]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 px-2 py-2 sm:gap-2 sm:px-4">
        {/* Brand home button */}
        <button
          id="hud-home-btn"
          type="button"
          onClick={() => onChangeMode('title')}
          className="flex shrink-0 items-center gap-2 text-left transition hover:opacity-90"
          title={locale === 'vi' ? 'Về màn hình chờ' : 'Back to Title Screen'}
        >
          <span className="flex h-7 w-7 items-center justify-center border-2 border-[#FFCF3D] bg-[#1C1B19]">
            <Home className="h-3.5 w-3.5 text-[#FFCF3D]" />
          </span>
          <div className="hidden sm:block">
            <div className="font-pixel text-sm font-bold leading-none text-[#F5EFE6]">DOM</div>
            <div className="font-mono-code text-[10px] leading-tight text-[#A89F91]">TINY DOT</div>
          </div>
        </button>

        {/* Primary Mode Tabs + Modals */}
        <nav aria-label="Main navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-1.5">
          <button
            id="hud-game-tab"
            type="button"
            onClick={() => onChangeMode('game')}
            className={`pixel-btn flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-1.5 text-xs sm:gap-1.5 sm:px-3 sm:text-sm ${
              mode === 'game' ? 'pixel-btn-primary font-bold' : ''
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">{locale === 'vi' ? 'Game' : 'Play'}</span>
            <span className="hidden sm:inline">{locale === 'vi' ? 'Minigame' : 'Play'}</span>
          </button>

          <button
            id="hud-gallery-tab"
            type="button"
            onClick={() => onChangeMode('gallery')}
            className={`pixel-btn flex shrink-0 items-center gap-1 whitespace-nowrap px-2 py-1.5 text-xs sm:gap-1.5 sm:px-3 sm:text-sm ${
              mode === 'gallery' ? 'pixel-btn-primary font-bold' : ''
            }`}
          >
            <Grid2x2 className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">{locale === 'vi' ? 'Tranh' : 'Art'}</span>
            <span className="hidden sm:inline">{locale === 'vi' ? 'Xem tranh' : 'Gallery'}</span>
          </button>

          <button
            id="hud-merch-btn"
            type="button"
            onClick={onOpenMerch}
            className="pixel-btn flex shrink-0 items-center gap-1.5 whitespace-nowrap p-1.5 text-xs sm:px-3 sm:text-sm"
            title="Merchandise"
            aria-label="Merchandise"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-[#FFCF3D]" />
            <span className="hidden md:inline">Merch</span>
          </button>

          <button
            id="hud-about-btn"
            type="button"
            onClick={onOpenAbout}
            className="pixel-btn flex shrink-0 items-center gap-1.5 whitespace-nowrap p-1.5 text-xs sm:px-3 sm:text-sm"
            title={locale === 'vi' ? 'Về Dom' : 'About Dom'}
            aria-label="About Dom"
          >
            <User className="h-3.5 w-3.5 text-[#FFCF3D]" />
            <span className="hidden md:inline">{locale === 'vi' ? 'Về Dom' : 'About'}</span>
          </button>

          <button
            id="hud-contact-btn"
            type="button"
            onClick={onOpenContact}
            className="pixel-btn flex shrink-0 items-center gap-1.5 whitespace-nowrap p-1.5 text-xs sm:px-3 sm:text-sm"
            title={locale === 'vi' ? 'Liên hệ' : 'Contact'}
            aria-label="Contact"
          >
            <Mail className="h-3.5 w-3.5 text-[#FFCF3D]" />
            <span className="hidden md:inline">{locale === 'vi' ? 'Liên hệ' : 'Contact'}</span>
          </button>
        </nav>

        {/* Right utilities: Season, D-Pad (in game mode), Lang, Audio */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {mode === 'game' && (
            <>
              <button
                id="hud-season-btn"
                type="button"
                onClick={nextSeason}
                className="pixel-btn flex items-center gap-1 whitespace-nowrap p-1.5 text-xs sm:px-2"
                title={locale === 'vi' ? 'Đổi mùa triển lãm' : 'Switch exhibition season'}
                aria-label="Switch season"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#FFCF3D]" />
                <span className="hidden lg:inline">{season.badge[locale]}</span>
              </button>

              <button
                id="hud-dpad-btn"
                type="button"
                onClick={onToggleDpad}
                className={`pixel-btn whitespace-nowrap px-1.5 py-1.5 text-[11px] sm:px-2 sm:text-xs ${
                  showDpad ? 'border-[#FFCF3D] text-[#FFCF3D]' : ''
                }`}
                title={locale === 'vi' ? 'Bật/tắt D-Pad ảo' : 'Toggle Virtual D-Pad'}
              >
                PAD
              </button>
            </>
          )}

          <button
            id="hud-lang-btn"
            type="button"
            onClick={onToggleLocale}
            className="pixel-btn whitespace-nowrap px-1.5 py-1.5 text-[11px] sm:px-2 sm:text-xs"
            aria-label="Toggle language"
          >
            {locale.toUpperCase()}
          </button>

          <button
            id="hud-audio-btn"
            type="button"
            onClick={onToggleAudio}
            className="pixel-btn p-1.5"
            aria-label="Toggle audio"
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#FFCF3D]" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
