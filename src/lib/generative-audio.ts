import { noteToFreq, type ScaleName } from './music-theory';
import { logger } from './logger';

export interface SynthVoice {
  type: OscillatorType;
  octave: number;
  scaleIndex: number;
  detune: number;
  volume: number;
  attack: number;
  release: number;
  filterFreq: number;
  filterQ: number;
  lfoRate: number;
  lfoDepth: number;
}

export interface GenerativeTrack {
  name: string;
  artist: string;
  genre: string;
  duration: number;
  rootFreq: number;
  scale: ScaleName;
  voices: SynthVoice[];
}

interface ActiveNode {
  osc: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
}

export class GenerativePlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nodes: ActiveNode[] = [];
  private isPlaying = false;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;
  private onEnded?: () => void;

  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private closeContext(ctx: AudioContext) {
    if (this.ctx === ctx) {
      this.ctx = null;
    }
    ctx.close().catch(() => {});
  }

  play(track: GenerativeTrack, onEnded?: () => void) {
    this.stop(true);
    this.onEnded = onEnded;

    const ctx = this.getCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch((err) => {
        logger.warn('[GenerativePlayer] AudioContext resume failed:', err);
      });
    }

    this.isPlaying = true;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);
    this.masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 2);

    const scale = getScaleSemitones(track.scale);

    track.voices.forEach((voice) => {
      const semitone = scale[voice.scaleIndex % scale.length] + voice.octave * 12;
      const freq = noteToFreq(semitone, track.rootFreq);

      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = freq;
      osc.detune.value = voice.detune;
      osc.start();

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = voice.filterFreq;
      filter.Q.value = voice.filterQ;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(voice.volume, ctx.currentTime + voice.attack);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = voice.lfoRate;
      lfo.start();

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = voice.lfoDepth * voice.filterFreq;

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      this.nodes.push({ osc, gain, filter, lfo, lfoGain });
    });

    this.stopTimer = setTimeout(() => this.stop(), track.duration * 1000);
  }

  stop(immediate = false) {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    const ctx = this.ctx;
    const masterGain = this.masterGain;
    const nodes = this.nodes;
    const onEnded = this.onEnded;

    this.isPlaying = false;
    this.masterGain = null;
    this.nodes = [];
    this.onEnded = undefined;

    if (!ctx || !masterGain) {
      onEnded?.();
      return;
    }

    if (immediate) {
      nodes.forEach(({ osc, lfo }) => {
        try { osc.stop(); } catch {}
        try { lfo.stop(); } catch {}
      });
      masterGain.disconnect();
      onEnded?.();
      this.closeContext(ctx);
      return;
    }

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.4);

    nodes.forEach(({ gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
    });

    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null;
      nodes.forEach(({ osc, lfo }) => {
        try { osc.stop(); } catch {}
        try { lfo.stop(); } catch {}
      });
      masterGain.disconnect();
      onEnded?.();
      this.closeContext(ctx);
    }, 500);
  }

  get playing() {
    return this.isPlaying;
  }

  suspend() {
    if (this.ctx?.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  resumeIfSuspended() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

function getScaleSemitones(scale: ScaleName): number[] {
  const map: Record<ScaleName, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonicMajor: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
  };
  return map[scale] ?? map.pentatonicMinor;
}
