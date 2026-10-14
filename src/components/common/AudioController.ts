/**
 * Web Audio API synthesizer for Ondas Lab 3D
 * Explicit user consent required, clean gain ramps to avoid clicks.
 */

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private isEnabled: boolean = false;
  private volume: number = 0.2;

  public init() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtxClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setEnabled(enabled: boolean) {
    if (enabled && !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && enabled) {
      this.ctx.resume();
    }
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Play or update continuous tone (e.g. Doppler, single wave)
   */
  public playTone(freq: number) {
    if (!this.isEnabled) return;
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    // Audible safety clamp (20 Hz to 18000 Hz)
    const safeFreq = Math.max(20, Math.min(18000, freq));

    if (!this.osc1) {
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(safeFreq, this.ctx.currentTime);
      this.osc1.connect(this.masterGain);
      this.osc1.start();
    } else {
      this.osc1.frequency.setTargetAtTime(safeFreq, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Play or update dual tone for beats simulation (f1, f2)
   */
  public playBeats(freq1: number, freq2: number) {
    if (!this.isEnabled) return;
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const safeF1 = Math.max(20, Math.min(18000, freq1));
    const safeF2 = Math.max(20, Math.min(18000, freq2));

    if (!this.osc1) {
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(safeF1, this.ctx.currentTime);
      this.osc1.connect(this.masterGain);
      this.osc1.start();
    } else {
      this.osc1.frequency.setTargetAtTime(safeF1, this.ctx.currentTime, 0.05);
    }

    if (!this.osc2) {
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(safeF2, this.ctx.currentTime);
      this.osc2.connect(this.masterGain);
      this.osc2.start();
    } else {
      this.osc2.frequency.setTargetAtTime(safeF2, this.ctx.currentTime, 0.05);
    }
  }

  public stop() {
    if (this.osc1) {
      try {
        this.osc1.stop();
        this.osc1.disconnect();
      } catch {
        // Ignored
      }
      this.osc1 = null;
    }
    if (this.osc2) {
      try {
        this.osc2.stop();
        this.osc2.disconnect();
      } catch {
        // Ignored
      }
      this.osc2 = null;
    }
  }
}

export const labAudio = new AudioController();
