import { useCallback, useState } from 'react';
import type { ArtworkCollection, Locale, SeasonId } from './types/content';
import { DEFAULT_ACTIVE_SEASON, getCollectionById, seasons } from './data';
import { soundEngine } from './audio/SoundEngine';
import { TitleScreen } from './components/TitleScreen';
import { TopHud, type AppMode } from './components/TopHud';
import { GameView } from './components/GameView';
import { QuickGallery } from './components/QuickGallery';
import { ArtworkLightbox } from './components/ArtworkLightbox';
import { DialogBox, type ActiveDialog } from './components/DialogBox';
import { AboutModal, ContactModal, MerchModal } from './components/InfoModals';
import type { InteractionEvent } from './game/engine/GameEngine';

type OverlayState =
  | { kind: 'none' }
  | { kind: 'artwork'; collection: ArtworkCollection }
  | { kind: 'merch'; highlightId?: string }
  | { kind: 'about' }
  | { kind: 'contact' };

export function App() {
  const [mode, setMode] = useState<AppMode>('title');
  const [locale, setLocale] = useState<Locale>('vi');
  const [seasonId, setSeasonId] = useState<SeasonId>(DEFAULT_ACTIVE_SEASON);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showDpad, setShowDpad] = useState(false);

  const [overlay, setOverlay] = useState<OverlayState>({ kind: 'none' });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);

  const currentSeason = seasons[seasonId];

  const handleToggleLocale = () => setLocale((l) => (l === 'vi' ? 'en' : 'vi'));

  const handleToggleAudio = () => {
    const enabled = soundEngine.toggle();
    setAudioEnabled(enabled);
  };

  const handleChangeSeason = (id: SeasonId) => {
    setSeasonId(id);
    soundEngine.setTempo(seasons[id].bgmTempo);
  };

  const handleStartGame = () => {
    soundEngine.playChime();
    setMode('game');
  };

  const handleOpenGallery = () => {
    soundEngine.playChime();
    setActiveDialog(null);
    setOverlay({ kind: 'none' });
    setMode('gallery');
  };

  const handleGameInteract = useCallback((event: InteractionEvent) => {
    if (event.kind === 'npc') {
      const { npc, dialogue } = event;
      let actionButton: ActiveDialog['actionButton'] | undefined;
      if (npc.actionButton) {
        const btn = npc.actionButton;
        actionButton = {
          label: btn.label,
          onClick: () => {
            if (btn.actionType === 'about') setOverlay({ kind: 'about' });
            else if (btn.actionType === 'merch') setOverlay({ kind: 'merch' });
            else if (btn.actionType === 'contact') setOverlay({ kind: 'contact' });
            else if (btn.actionType === 'gallery') setMode('gallery');
            else if (btn.actionType === 'artwork' && btn.collectionId) {
              const col = getCollectionById(btn.collectionId);
              if (col) setOverlay({ kind: 'artwork', collection: col });
            }
          },
        };
      }
      setActiveDialog({
        speaker: npc.name,
        portrait: npc.spriteKey,
        lines: dialogue,
        actionButton,
      });
      return;
    }

    const action = event.prop.action;
    if (!action) return;

    switch (action.type) {
      case 'artwork': {
        const col = getCollectionById(action.collectionId);
        if (col) setOverlay({ kind: 'artwork', collection: col });
        break;
      }
      case 'merch':
        setOverlay({ kind: 'merch' });
        break;
      case 'about':
        setOverlay({ kind: 'about' });
        break;
      case 'contact':
        setOverlay({ kind: 'contact' });
        break;
      case 'gallery':
        setMode('gallery');
        break;
      case 'dialog':
        setActiveDialog({
          speaker: action.speaker,
          portrait: action.portrait,
          lines: action.lines,
        });
        break;
    }
  }, []);

  const isGamePaused = overlay.kind !== 'none' || activeDialog !== null;

  return (
    <div className="min-h-dvh w-full bg-[#131211] text-[#F5EFE6]">
      {mode === 'title' ? (
        <TitleScreen
          locale={locale}
          season={currentSeason}
          audioEnabled={audioEnabled}
          onStartGame={handleStartGame}
          onOpenGallery={handleOpenGallery}
          onToggleLocale={handleToggleLocale}
          onToggleAudio={handleToggleAudio}
          onChangeSeason={handleChangeSeason}
        />
      ) : (
        <>
          <TopHud
            mode={mode}
            locale={locale}
            season={currentSeason}
            audioEnabled={audioEnabled}
            showDpad={showDpad}
            onChangeMode={(next) => {
              setActiveDialog(null);
              setOverlay({ kind: 'none' });
              setMode(next);
            }}
            onOpenMerch={() => setOverlay({ kind: 'merch' })}
            onOpenAbout={() => setOverlay({ kind: 'about' })}
            onOpenContact={() => setOverlay({ kind: 'contact' })}
            onToggleLocale={handleToggleLocale}
            onToggleAudio={handleToggleAudio}
            onToggleDpad={() => setShowDpad((v) => !v)}
            onChangeSeason={handleChangeSeason}
          />

          {mode === 'game' ? (
            <GameView
              locale={locale}
              season={currentSeason}
              paused={isGamePaused}
              showDpad={showDpad}
              onInteract={handleGameInteract}
            />
          ) : (
            <QuickGallery
              locale={locale}
              onSelectCollection={(collection) => setOverlay({ kind: 'artwork', collection })}
              onSwitchToGame={() => setMode('game')}
            />
          )}
        </>
      )}

      {/* RPG Dialog Box */}
      {activeDialog && (
        <DialogBox
          dialog={activeDialog}
          locale={locale}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {/* Modals */}
      {overlay.kind === 'artwork' && (
        <ArtworkLightbox
          collection={overlay.collection}
          locale={locale}
          onClose={() => setOverlay({ kind: 'none' })}
          onOpenMerch={(highlightId) => setOverlay({ kind: 'merch', highlightId })}
        />
      )}

      {overlay.kind === 'merch' && (
        <MerchModal
          locale={locale}
          highlightId={overlay.highlightId}
          onClose={() => setOverlay({ kind: 'none' })}
          onViewCollection={(collection) => setOverlay({ kind: 'artwork', collection })}
          onOpenContact={() => setOverlay({ kind: 'contact' })}
        />
      )}

      {overlay.kind === 'about' && (
        <AboutModal
          locale={locale}
          onClose={() => setOverlay({ kind: 'none' })}
          onOpenContact={() => setOverlay({ kind: 'contact' })}
        />
      )}

      {overlay.kind === 'contact' && (
        <ContactModal locale={locale} onClose={() => setOverlay({ kind: 'none' })} />
      )}
    </div>
  );
}
