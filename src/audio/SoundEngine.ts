import type { SeasonId, SurfaceType, TimePeriod } from '../types/content';

export interface AudioManifest {
  bgm?: Record<string, string>; // e.g. "default_night", "default_day", "tet_night", "default"
  ambient?: Record<string, string>; // e.g. "day", "night"
  sfx?: Record<string, string>; // e.g. "meow", "chime", "blip", "step_grass", "step_wood"
}

/**
 * Hybrid Web Audio Engine:
 * - File-first: automatically uses real .mp3/.ogg files dropped into public/assets/audio/ (via manifest.json)
 *   with smooth crossfades and indoor low-pass muffling.
 * - Procedural fallback: warm multi-voice synth BGM, surface-aware footsteps (grass/stone/wood/carpet),
 *   cute cat meow, and gentle ambient layer when no audio files are provided yet.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
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

  // Cached decoded SFX buffers for instant zero-latency custom sound effects
  private sfxBuffers = new Map<string, AudioBuffer | 'loading' | 'failed'>();

  // Warm pentatonic progressions: brighter in daytime, mellower at night
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

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
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

  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.initManifest();

    if (this.enabled) {
      this.ensureContext();
      this.playChime();
      this.syncTracks();
      this.applyIndoorFilter();
    } else {
      this.stopAllLoops();
    }
    return this.enabled;
  }

  public enable(): void {
    if (!this.enabled) {
      this.toggle();
    }
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

    // 1. BGM: file-first with crossfade, fallback to procedural synth
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

    // 2. Ambient: file-first with indoor low-pass filter, fallback to subtle procedural ambient
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
    gain.gain.linearRampToValueAtTime(0.28, now + 1.2);

    source.connect(gain);
    gain.connect(ctx.destination);

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
    gain.gain.setValueAtTime(this.indoors ? 0.07 : 0.2, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

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
        this.indoors ? 0.065 : 0.2,
        now + 0.45
      );
    }
    if (this.bgmGain) {
      this.bgmGain.gain.linearRampToValueAtTime(this.indoors ? 0.3 : 0.24, now + 0.45);
    }
  }

  private startProceduralBgm(): void {
    if (this.bgmTimer !== null) return;
    const stepMs = Math.round((60 / this.tempo) * 500);
    this.bgmTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const melody = this.period === 'day' ? this.dayMelody : this.nightMelody;
      const freq = melody[this.noteIndex % melody.length];
      this.noteIndex++;
      const vol = this.indoors ? 0.032 : 0.025;
      this.playTone(freq, 0.28, 'triangle', vol);
      if (this.noteIndex % 4 === 1) {
        this.playTone(freq / 2, 0.48, 'sine', vol * 0.78);
      }
    }, stepMs);
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
      // Quietly attenuate outdoor cricket/bird ambience when indoors
      const gainScale = this.indoors ? 0.28 : 1.0;
      if (this.period === 'night') {
        // Gentle night cricket twin-chirp
        if (Math.random() < 0.55) {
          const f = 3600 + Math.random() * 260;
          this.playTone(f, 0.035, 'sine', 0.005 * gainScale);
          window.setTimeout(() => this.playTone(f + 40, 0.035, 'sine', 0.004 * gainScale), 70);
        }
      } else {
        // Soft distant daytime bird chirp
        if (Math.random() < 0.4) {
          const base = 1750 + Math.random() * 450;
          this.playTone(base, 0.07, 'sine', 0.006 * gainScale);
          window.setTimeout(() => this.playTone(base * 1.18, 0.09, 'sine', 0.005 * gainScale), 90);
        }
      }
    }, 2600);
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

  private tryPlayCustomSfx(key: string, volume = 0.4): boolean {
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
      gain.connect(ctx.destination);
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

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playFilteredNoise(duration: number, filterFreq: number, gainValue: number): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

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
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  public playStep(surface: SurfaceType = 'wood', isRunning = false): void {
    if (!this.enabled) return;
    const customKey = `step_${surface}`;
    if (this.tryPlayCustomSfx(customKey, isRunning ? 0.35 : 0.25)) return;

    const boost = isRunning ? 1.25 : 1.0;
    switch (surface) {
      case 'grass':
        this.playFilteredNoise(0.055, 1100 + Math.random() * 300, 0.028 * boost);
        break;
      case 'stone':
        this.playTone(230 + Math.random() * 45, 0.038, 'triangle', 0.024 * boost, 140);
        break;
      case 'carpet':
        this.playTone(95 + Math.random() * 18, 0.04, 'sine', 0.018 * boost, 70);
        break;
      case 'wood':
      default:
        this.playTone(145 + Math.random() * 25, 0.048, 'triangle', 0.022 * boost, 105);
        break;
    }
  }

  public playMeow(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('meow', 0.45)) return;
    // Cute upward-then-downward pixel cat meow
    this.playTone(580, 0.09, 'triangle', 0.042, 790);
    window.setTimeout(() => {
      this.playTone(780, 0.16, 'triangle', 0.038, 520);
    }, 85);
  }

  public playBlip(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('blip', 0.28)) return;
    this.playTone(540 + Math.random() * 60, 0.04, 'square', 0.016);
  }

  public playChime(): void {
    if (!this.enabled) return;
    if (this.tryPlayCustomSfx('chime', 0.35)) return;
    this.playTone(523.25, 0.14, 'triangle', 0.042);
    window.setTimeout(() => this.playTone(659.25, 0.18, 'triangle', 0.038), 85);
  }
}

export const soundEngine = new SoundEngine();
