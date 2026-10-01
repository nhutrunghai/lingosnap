/**
 * Offline Focus Ambient Sound Generator using Web Audio API
 * No external audio files or network requests required.
 */

class FocusAudioManager {
  private ctx: AudioContext | null = null;
  private noiseNodes: {
    rain?: { source: AudioNode; gain: GainNode };
    white?: { source: AudioNode; gain: GainNode };
    brown?: { source: AudioNode; gain: GainNode };
  } = {};

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Create continuous brown noise buffer (Rain / Water rumble)
  private createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain boost
    }
    return buffer;
  }

  // Create continuous white noise buffer
  private createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }
    return buffer;
  }

  // Toggle or adjust Rain Sound
  public setRain(enabled: boolean, volume = 0.5): void {
    const ctx = this.getContext();
    if (!enabled) {
      if (this.noiseNodes.rain) {
        this.noiseNodes.rain.gain.gain.setValueAtTime(0, ctx.currentTime);
        this.noiseNodes.rain.source.disconnect();
        delete this.noiseNodes.rain;
      }
      return;
    }

    if (!this.noiseNodes.rain) {
      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = this.createBrownNoiseBuffer(ctx);
      bufferSource.loop = true;

      // Low-pass filter to sound like gentle soothing rain
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      bufferSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      bufferSource.start(0);
      this.noiseNodes.rain = { source: bufferSource, gain };
    } else {
      this.noiseNodes.rain.gain.gain.setValueAtTime(volume, ctx.currentTime);
    }
  }

  // Toggle White Noise
  public setWhiteNoise(enabled: boolean, volume = 0.3): void {
    const ctx = this.getContext();
    if (!enabled) {
      if (this.noiseNodes.white) {
        this.noiseNodes.white.gain.gain.setValueAtTime(0, ctx.currentTime);
        this.noiseNodes.white.source.disconnect();
        delete this.noiseNodes.white;
      }
      return;
    }

    if (!this.noiseNodes.white) {
      const bufferSource = ctx.createBufferSource();
      bufferSource.buffer = this.createWhiteNoiseBuffer(ctx);
      bufferSource.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      bufferSource.connect(gain);
      gain.connect(ctx.destination);

      bufferSource.start(0);
      this.noiseNodes.white = { source: bufferSource, gain };
    } else {
      this.noiseNodes.white.gain.gain.setValueAtTime(volume, ctx.currentTime);
    }
  }

  // Play a gentle Completion Chime sound when Pomodoro/session ends
  public playChime(): void {
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.85);
      });
    } catch (err) {
      console.warn('Could not play chime:', err);
    }
  }

  public stopAll(): void {
    this.setRain(false);
    this.setWhiteNoise(false);
  }
}

export const focusAudio = new FocusAudioManager();
