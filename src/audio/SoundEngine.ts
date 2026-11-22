/**
 * Ultra-lightweight Web Audio API cozy chiptune/lofi synthesizer.
 * Zero external audio downloads; gracefully respects browser autoplay policy.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private bgmTimer: number | null = null;
  private noteIndex = 0;
  private tempo = 76;

  // Warm C-major / A-minor cozy pentatonic progression
  private readonly melody = [
    261.63, 329.63, 392.0, 523.25,
    440.0, 392.0, 329.63, 293.66,
    261.63, 293.66, 392.0, 440.0,
    392.0, 329.63, 293.66, 261.63,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    if (this.enabled) {
      this.stopBgmLoop();
      this.startBgmLoop();
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureContext();
      this.playChime();
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    return this.enabled;
  }

  public enable(): void {
    if (!this.enabled) {
      this.toggle();
    }
  }

  private startBgmLoop(): void {
    if (this.bgmTimer !== null) return;
    const stepMs = Math.round((60 / this.tempo) * 500);
    this.bgmTimer = window.setInterval(() => {
      if (!this.enabled) return;
      const freq = this.melody[this.noteIndex % this.melody.length];
      this.noteIndex++;
      this.playTone(freq, 0.28, 'triangle', 0.032);
      if (this.noteIndex % 4 === 1) {
        this.playTone(freq / 2, 0.45, 'sine', 0.025);
      }
    }, stepMs);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playStep(): void {
    this.playTone(135 + Math.random() * 25, 0.045, 'triangle', 0.02);
  }

  public playBlip(): void {
    this.playTone(540 + Math.random() * 60, 0.04, 'square', 0.018);
  }

  public playChime(): void {
    this.playTone(523.25, 0.14, 'triangle', 0.045);
    window.setTimeout(() => this.playTone(659.25, 0.18, 'triangle', 0.04), 85);
  }
}

export const soundEngine = new SoundEngine();
