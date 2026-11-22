import type { SeasonId, SurfaceType, TimePeriod } from '../types/content';

export interface AudioManifest {
  bgm?: Record<string, string>; // e.g. "default_night", "default_day", "tet_night", "default"
  ambient?: Record<string, string>; // e.g. "day", "night"
  sfx?: Record<string, string>; // e.g. "meow", "chime", "blip", "step_grass", "step_wood"
}

/**
 * Tiny valid 0.1s silent PCM WAV data URI used to switch iOS Safari out of
 * ringer-muted ambient mode into Media Playback mode so Web Audio plays reliably
 * on iPhone/iPad even when the hardware silent switch is enabled.
 */
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * Hybrid Web Audio Engine:
 * - Cross-browser & iOS-Safari resilient: synchronously unlocks AudioContext inside
 *   user gestures, sets navigator.audioSession = 'playback' (iOS 17+), plays silent
 *   HTML <audio> unlock for iOS silent-switch bypass, and handles 'interrupted' state.
 * - File-first: automatically uses real .mp3/.ogg files from public/assets/audio/manifest.json.
 * - Procedural fallback: clear, warm lo-fi/chiptune BGM, surface-aware footsteps,
 *   cute cat meow, and gentle day/night ambient layer.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unlockAudioEl: HTMLAudioElement | null = null;
  private globalUnlockBound = false;

  private enabled = false;
  private manifestLoaded = false;
  private manifest: AudioManifest = {};

  private seasonId: SeasonId = 'default';
  private period: TimePeriod = 'night';
  private indoors = false;
  private tempo = 76;

  // Procedural BGM & ambient timers
  private bgmTimer: number | null = null;
  private ambientTimer: number | null = null;
  private noteIndex = 0;

  // File-based BGM & Ambient playback with smooth crossfade / indoor filter
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSourceKey: string | null = null;
  private bgmGain: GainNode | null = null;

  private ambientAudio: HTMLAudioElement | null = null;
  private ambientSourceKey: string | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  // Cached decoded SFX buffers
  private sfxBuffers = new Map<string, AudioBuffer | 'loading' | 'failed'>();

  private readonly nightMelody = [
    261.63, 329.63, 392.0, 523.25,
    440.0, 392.0, 329.63, 293.66,
    261.63, 293.66, 392.0, 440.0,
    392.0, 329.63, 293.66, 261.63,
  ];

  private readonly dayMelody = [
    329.63, 392.0, 440.0, 523.25,
    587.33, 523.25, 440.0, 392.0,
    329.63, 392.0, 523.25, 587.33,
    523.25, 440.0, 392.0, 329.63,
  ];

  public initManifest(): void {
    if (this.manifestLoaded || typeof window === 'undefined') return;
    this.manifestLoaded = true;

    const base = import.meta.env?.BASE_URL || '/';
    void fetch(`${base}assets/audio/manifest.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AudioManifest | null) => {
        if (!data) return;
        this.manifest = data;
        if (this.enabled) {
          this.syncTracks();
        }
      })
      .catch(() => {
        // Silent fallback to procedural audio
      });
  }

  private resolveUrl(relPath: string): string {
    const base = import.meta.env?.BASE_URL || '/';
    if (relPath.startsWith('http') || relPath.startsWith('/')) return relPath;
    return `${base}${relPath}`;
  }

  private bindGlobalReunlock(): void {
    if (this.globalUnlockBound || typeof window === 'undefined') return;
    this.globalUnlockBound = true;

    const onUserGesture = () => {
      if (!this.enabled) return;
      const ctx = this.ctx;
      if (ctx && ctx.state !== 'running') {
        void ctx.resume();
        this.playSilentUnlockPulse(ctx);
      }
    };

    window.addEventListener('pointerdown', onUserGesture, { passive: true });
    window.addEventListener('touchend', onUserGesture, { passive: true });
    window.addEventListener('keydown', onUserGesture, { passive: true });
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Clean, direct masterGain -> destination (universally reliable across all WebViews & Safari)
      const master = this.ctx.createGain();
      master.gain.value = 0.85;
      master.connect(this.ctx.destination);
      this.masterGain = master;
    }
    return this.ctx;
  }

  private getOutputNode(ctx: AudioContext): AudioNode {
    return this.masterGain || ctx.destination;
  }

  private playSilentUnlockPulse(ctx: AudioContext): void {
    try {
      // 1. iOS 17+ AudioSession API: ensure playback even when hardware ringer switch is muted
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) {
        nav.audioSession.type = 'playback';
      }
    } catch {
      // Ignore unsupported browsers
    }

    try {
      // 2. Synchronous 1-sample Web Audio buffer unlock (required by Safari)
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore
    }

    try {
      // 3. Synchronous HTML <audio> unlock (switches iOS Safari out of muted ambient mode)
      if (!this.unlockAudioEl) {
        const el = new Audio(SILENT_WAV_DATA_URI);
        el.setAttribute('playsinline', 'true');
        el.volume = 0.01;
        this.unlockAudioEl = el;
      }
      void this.unlockAudioEl.play().catch(() => {
        // Ignore if autoplay policy rejects outside gesture
      });
    } catch {
      // Ignore
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getDebugState(): string {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  public setTempo(bpm: number): void {
    this.tempo = bpm;
    if (this.enabled && !this.bgmAudio) {
      this.stopProceduralBgm();
      this.startProceduralBgm();
    }
  }

  public setEnvironment(seasonId: SeasonId, period: TimePeriod, indoors: boolean): void {
    const trackChanged = this.seasonId !== seasonId || this.period !== period;
    const indoorChanged = this.indoors !== indoors;
    this.seasonId = seasonId;
    this.period = period;
    this.indoors = indoors;

    if (!this.enabled) return;

    if (trackChanged) {
      this.syncTracks();
    }
    if (indoorChanged) {
      this.applyIndoorFilter();
    }
  }

  private activateAudioPipeline(): void {
    this.bindGlobalReunlock();
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Unlock synchronously inside the user click/tap gesture!
    this.playSilentUnlockPulse(ctx);
    if (ctx.state !== 'running') {
      void ctx.resume();
    }

    // Play immediate confirmation chime & start BGM/ambient right away
    this.playChime();
    this.syncTracks();
    this.applyIndoorFilter();
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.initManifest();

    if (this.enabled) {
      this.activateAudioPipeline();
    } else {
      this.stopAllLoops();
    }
    return this.enabled;
  }

  public enable(): boolean {
    if (!this.enabled) {
      return this.toggle();
    }
    const ctx = this.ctx;
    if (ctx && ctx.state !== 'running') {
      this.playSilentUnlockPulse(ctx);
      void ctx.resume();
    }
    return true;
  }

  private resolveBgmPath(): { key: string; url: string } | null {
    const bgm = this.manifest.bgm;
    if (!bgm) return null;
    const periodKey = this.period === 'day' ? 'day' : 'night';
    const candidates = [
      `${this.seasonId}_${periodKey}`,
      this.seasonId,
      `default_${periodKey}`,
      'default',
    ];
    for (const key of candidates) {
      if (bgm[key]) return { key, url: this.resolveUrl(bgm[key]) };
    }
    return null;
  }

  private resolveAmbientPath(): { key: string; url: string } | null {
    const amb = this.manifest.ambient;
    if (!amb) return null;
    const key = this.period === 'day' ? 'day' : 'night';
    if (amb[key]) return { key, url: this.resolveUrl(amb[key]) };
    return null;
  }

  private syncTracks(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const bgmMatch = this.resolveBgmPath();
    if (bgmMatch) {
      this.stopProceduralBgm();
      if (this.bgmSourceKey !== bgmMatch.key) {
        this.crossfadeFileBgm(ctx, bgmMatch.key, bgmMatch.url);
      }
    } else {
      this.stopFileBgm();
      this.startProceduralBgm();
    }

    const ambMatch = this.resolveAmbientPath();
    if (ambMatch) {
      this.stopProceduralAmbient();
      if (this.ambientSourceKey !== ambMatch.key) {
        this.startFileAmbient(ctx, ambMatch.key, ambMatch.url);
      }
    } else {
      this.stopFileAmbient();
      this.startProceduralAmbient();
    }
  }

  private crossfadeFileBgm(ctx: AudioContext, key: string, url: string): void {
    this.stopFileBgm();
    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';

    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 1.2);

    source.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    this.bgmAudio = audio;
    this.bgmGain = gain;
    this.bgmSourceKey = key;

    void audio.play().catch(() => {
      this.stopFileBgm();
      this.startProceduralBgm();
    });
  }

  private stopFileBgm(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = '';
      this.bgmAudio = null;
    }
    this.bgmGain = null;
    this.bgmSourceKey = null;
  }

  private startFileAmbient(ctx: AudioContext, key: string, url: string): void {
    this.stopFileAmbient();
    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';

    const source = ctx.createMediaElementSource(audio);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.indoors ? 650 : 12000, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.indoors ? 0.12 : 0.3, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));

    this.ambientAudio = audio;
    this.ambientFilter = filter;
    this.ambientGain = gain;
    this.ambientSourceKey = key;

    void audio.play().catch(() => {
      this.stopFileAmbient();
      this.startProceduralAmbient();
    });
  }

  private stopFileAmbient(): void {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.src = '';
      this.ambientAudio = null;
    }
    this.ambientFilter = null;
    this.ambientGain = null;
    this.ambientSourceKey = null;
  }

  private applyIndoorFilter(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.ambientFilter && this.ambientGain) {
      this.ambientFilter.frequency.exponentialRampToValueAtTime(
        this.indoors ? 620 : 12000,
        now + 0.45
      );
      this.ambientGain.gain.linearRampToValueAtTime(
        this.indoors ? 0.1 : 0.28,
        now + 0.45
      );
    }
    if (this.bgmGain) {
      this.bgmGain.gain.linearRampToValueAtTime(this.indoors ? 0.42 : 0.34, now + 0.45);
    }
  }

  private playNextBgmBeat(): void {
    if (!this.enabled) return;
    const melody = this.period === 'day' ? this.dayMelody : this.nightMelody;
    const freq = melody[this.noteIndex % melody.length];
    this.noteIndex++;
    const vol = this.indoors ? 0.16 : 0.13;
    this.playTone(freq, 0.36, 'triangle', vol);
    if (this.noteIndex % 4 === 1) {
      this.playTone(freq / 2, 0.65, 'sine', vol * 0.85);
    }
  }

  private startProceduralBgm(): void {
    if (this.bgmTimer !== null) return;
    const stepMs = Math.round((60 / this.tempo) * 500);
    window.setTimeout(() => this.playNextBgmBeat(), 280);
    this.bgmTimer = window.setInterval(() => this.playNextBgmBeat(), stepMs);
  }

  private stopProceduralBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private startProceduralAmbient(): void {
    if (this.ambientTimer !== null) return;
    this.ambientTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const gainScale = this.indoors ? 0.3 : 1.0;
      if (this.period === 'night') {
        if (Math.random() < 0.6) {
          const f = 3200 + Math.random() * 240;
          this.playTone(f, 0.045, 'sine', 0.025 * gainScale);
          window.setTimeout(() => this.playTone(f + 45, 0.045, 'sine', 0.02 * gainScale), 75);
        }
      } else {
        if (Math.random() < 0.45) {
          const base = 1550 + Math.random() * 380;
          this.playTone(base, 0.09, 'sine', 0.032 * gainScale, base * 1.15);
          window.setTimeout(
            () => this.playTone(base * 1.18, 0.1, 'sine', 0.026 * gainScale, base * 1.02),
            100
          );
        }
      }
    }, 2400);
  }

  private stopProceduralAmbient(): void {
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private stopAllLoops(): void {
    this.stopProceduralBgm();
    this.stopProceduralAmbient();
    this.stopFileBgm();
    this.stopFileAmbient();
  }

  private tryPlayCustomSfx(key: string, volume = 0.6): boolean {
    const relPath = this.manifest.sfx?.[key];
    if (!relPath) return false;
    const ctx = this.ensureContext();
    if (!ctx) return false;

    const cached = this.sfxBuffers.get(key);
    if (cached && cached !== 'loading' && cached !== 'failed') {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = cached;
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.getOutputNode(ctx));
      src.start();
      return true;
    }

    if (!cached) {
      this.sfxBuffers.set(key, 'loading');
      void fetch(this.resolveUrl(relPath))
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          this.sfxBuffers.set(key, decoded);
        })
        .catch(() => {
          this.sfxBuffers.set(key, 'failed');
        });
    }
    return false;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    endFreq?: number
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    const attack = Math.min(0.02, duration * 0.25);
    const sustainEnd = Math.max(attack, duration * 0.55);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + attack);
    gain.gain.setValueAtTime(gainValue * 0.85, now + sustainEnd);
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private playFilteredNoise(duration: number, filterFreq: number, gainValue: number): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      void ctx.resume();
    }

    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.getOutputNode(ctx));
    src.start(now);
  }

  public playStep(surface: SurfaceType = 'wood', isRunning = false): void {
    if (!this.enabled) return;
    const customKey = `step_${surface}`;
    if (this.tryPlayCustomSfx(customKey, isRunning ? 0.55 : 0.4)) return;

    const boost = isRunning ? 1.28 : 1.0;
    switch (surface) {
      case 'grass':
        this.playFilteredNoise(0.065, 1150 + Math.random() * 300, 0.15 * boost);
        break;
      case 'stone':
        this.playTone(250 + Math.random() * 45, 0.05, 'triangle', 0.13 * boost, 145);
        break;
      case 'carpet':
        this.playTone(105 + Math.random() * 18, 0.055, 'sine', 0.11 * boost, 72);
        break;
      case 'wood':
      default:
        this.playTone(165 + Math.random() * 28, 0.06, 'triangle', 0.13 * boost, 112);
        break;
    }
  }

  public playMeow(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('meow', 0.65)) return;
    this.playTone(620, 0.11, 'triangle', 0.22, 880);
    window.setTimeout(() => {
      this.playTone(860, 0.19, 'triangle', 0.2, 540);
    }, 95);
  }

  public playBlip(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('blip', 0.35)) return;
    this.playTone(540 + Math.random() * 60, 0.045, 'square', 0.075);
  }

  public playChime(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('chime', 0.5)) return;
    this.playTone(523.25, 0.18, 'triangle', 0.22);
    window.setTimeout(() => this.playTone(659.25, 0.24, 'triangle', 0.2), 95);
  }

  public playPageFlip(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('page_flip', 0.45)) return;
    // Soft two-step paper rustle + gentle spine settle
    this.playFilteredNoise(0.085, 1950 + Math.random() * 260, 0.14);
    window.setTimeout(() => {
      this.playFilteredNoise(0.06, 1250 + Math.random() * 180, 0.09);
    }, 55);
  }
}

export const soundEngine = new SoundEngine();
