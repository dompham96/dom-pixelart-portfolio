import { useCallback, useState } from 'react';
import type {
  ArtworkCollection,
  CharacterAppearance,
  Locale,
  SeasonId,
  TimeOfDayMode,
} from './types/content';
import { DEFAULT_ACTIVE_SEASON, getCollectionById, seasons } from './data';
import {
  loadOrCreateVisitorAppearance,
  randomizeAppearance,
  saveVisitorAppearance,
} from './data/characterOptions';
import { soundEngine } from './audio/SoundEngine';
import { evaluateTimeOfDay, TIME_MODE_ORDER, type TimeOfDayState } from './game/engine/TimeOfDay';
import { TitleScreen } from './components/TitleScreen';
import { TopHud, type AppMode } from './components/TopHud';
import { GameView } from './components/GameView';
import { QuickGallery } from './components/QuickGallery';
import { ArtworkLightbox } from './components/ArtworkLightbox';
import { DialogBox, type ActiveDialog } from './components/DialogBox';
import { AboutModal, ContactModal, MerchModal } from './components/InfoModals';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import type { InteractionEvent } from './game/engine/GameEngine';

type OverlayState =
  | { kind: 'none' }
  | { kind: 'artwork'; collection: ArtworkCollection }
  | { kind: 'merch'; highlightId?: string }
  | { kind: 'about' }
  | { kind: 'contact' }
  | { kind: 'customizer' };

export function App() {
  const [mode, setMode] = useState<AppMode>('title');
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [locale, setLocale] = useState<Locale>('vi');
  const [seasonId, setSeasonId] = useState<SeasonId>(DEFAULT_ACTIVE_SEASON);
  const [timeMode, setTimeMode] = useState<TimeOfDayMode>('auto');
  const [timeState, setTimeState] = useState<TimeOfDayState>(() => evaluateTimeOfDay('auto'));
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [userMutedAudio, setUserMutedAudio] = useState(false);
  const [showDpad, setShowDpad] = useState(false);
  const [playerAppearance, setPlayerAppearance] = useState<CharacterAppearance>(() =>
    loadOrCreateVisitorAppearance()
  );

  const [overlay, setOverlay] = useState<OverlayState>({ kind: 'none' });
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);

  const currentSeason = seasons[seasonId];

  const handleChangeAppearance = useCallback((next: CharacterAppearance) => {
    setPlayerAppearance(next);
    saveVisitorAppearance(next);
  }, []);

  const handleRandomizeAppearance = useCallback(() => {
    const next = randomizeAppearance();
    setPlayerAppearance(next);
    saveVisitorAppearance(next);
    soundEngine.playChime();
  }, []);

  const switchMode = useCallback((next: AppMode) => {
    setActiveDialog(null);
    setOverlay({ kind: 'none' });
    if (next === 'game') setHasStartedGame(true);
    setMode(next);
  }, []);

  const handleToggleLocale = () => setLocale((l) => (l === 'vi' ? 'en' : 'vi'));

  const handleToggleAudio = () => {
    const enabled = soundEngine.toggle();
    setAudioEnabled(enabled);
    setUserMutedAudio(!enabled);
  };

  const handleChangeSeason = (id: SeasonId) => {
    setSeasonId(id);
    soundEngine.setTempo(seasons[id].bgmTempo);
  };

  const handleCycleTimeMode = () => {
    const idx = TIME_MODE_ORDER.indexOf(timeMode);
    const next = TIME_MODE_ORDER[(idx + 1) % TIME_MODE_ORDER.length];
    setTimeMode(next);
    setTimeState(evaluateTimeOfDay(next));
  };

  const handleStartGame = () => {
    if (!audioEnabled && !userMutedAudio) {
      const enabled = soundEngine.enable();
      setAudioEnabled(enabled);
    } else {
      soundEngine.playChime();
    }
    switchMode('game');
  };

  const handleOpenGallery = () => {
    soundEngine.playChime();
    switchMode('gallery');
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
            else if (btn.actionType === 'gallery') switchMode('gallery');
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
        switchMode('gallery');
        break;
      case 'dialog':
        setActiveDialog({
          speaker: action.speaker,
          portrait: action.portrait,
          lines: action.lines,
        });
        break;
    }
  }, [switchMode]);

  const isGamePaused = mode !== 'game' || overlay.kind !== 'none' || activeDialog !== null;

  return (
    <div className="min-h-dvh w-full bg-[#131211] text-[#F5EFE6]">
      {mode === 'title' && (
        <TitleScreen
          locale={locale}
          season={currentSeason}
          playerAppearance={playerAppearance}
          onStartGame={handleStartGame}
          onOpenGallery={handleOpenGallery}
          onOpenCustomizer={() => setOverlay({ kind: 'customizer' })}
          onRandomizeAppearance={handleRandomizeAppearance}
        />
      )}

      {mode !== 'title' && (
        <TopHud
          mode={mode}
          locale={locale}
          season={currentSeason}
          timeState={timeState}
          audioEnabled={audioEnabled}
          showDpad={showDpad}
          onChangeMode={switchMode}
          onOpenCustomizer={() => setOverlay({ kind: 'customizer' })}
          onOpenMerch={() => setOverlay({ kind: 'merch' })}
          onOpenAbout={() => setOverlay({ kind: 'about' })}
          onOpenContact={() => setOverlay({ kind: 'contact' })}
          onToggleLocale={handleToggleLocale}
          onToggleAudio={handleToggleAudio}
          onToggleDpad={() => setShowDpad((v) => !v)}
          onChangeSeason={handleChangeSeason}
          onCycleTimeMode={handleCycleTimeMode}
        />
      )}

      {/* Keep GameView mounted once started so switching to Gallery or Title preserves minigame progress */}
      {hasStartedGame && (
        <GameView
          locale={locale}
          season={currentSeason}
          timeMode={timeMode}
          playerAppearance={playerAppearance}
          active={mode === 'game'}
          paused={isGamePaused}
          showDpad={showDpad}
          onInteract={handleGameInteract}
          onTimeStateChange={setTimeState}
        />
      )}

      {mode === 'gallery' && (
        <QuickGallery
          locale={locale}
          onSelectCollection={(collection) => setOverlay({ kind: 'artwork', collection })}
          onSwitchToGame={() => switchMode('game')}
        />
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
      {overlay.kind === 'customizer' && (
        <CharacterCustomizerModal
          locale={locale}
          appearance={playerAppearance}
          onChange={handleChangeAppearance}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

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
