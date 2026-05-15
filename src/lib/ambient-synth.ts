type OscConfig = {
  frequency: number;
  type: OscillatorType;
  detune: number;
  volume: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class AmbientSynth {
  ctx: AudioContext | null = null;
  oscillators: OscillatorNode[] = [];
  gains: GainNode[] = [];
  filters: BiquadFilterNode[] = [];
  masterGain: GainNode | null = null;
  lfoInterval: ReturnType<typeof setInterval> | null = null;
  isPlaying = false;

  private getContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  private makeConfigs(
    energy: number,
    environment: string,
    emotion: string
  ): OscConfig[] {
    const t = energy / 100;

    const baseFreq =
      environment === 'rain'
        ? 120
        : environment === 'city'
          ? 180
          : environment === 'mountain'
            ? 90
            : environment === 'sunset'
              ? 150
              : 100;

    const emotionMod =
      emotion === 'happy'
        ? 1.3
        : emotion === 'dreamy'
          ? 0.8
          : emotion === 'melancholy'
            ? 0.7
            : 1.0;

    const configs: OscConfig[] = [
      {
        frequency: baseFreq * emotionMod,
        type: 'sine',
        detune: -5,
        volume: lerp(0.08, 0.15, t),
      },
      {
        frequency: baseFreq * emotionMod * 1.5,
        type: 'triangle',
        detune: 3,
        volume: lerp(0.03, 0.08, t),
      },
      {
        frequency: baseFreq * emotionMod * 2,
        type: 'sine',
        detune: -2,
        volume: lerp(0.02, 0.05, t),
      },
    ];

    if (energy > 60) {
      configs.push({
        frequency: baseFreq * emotionMod * 0.5,
        type: 'sawtooth',
        detune: 0,
        volume: 0.02,
      });
    }

    return configs;
  }

  play(energy: number, environment: string, emotion: string) {
    if (this.isPlaying) {
      this.stop();
    }

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    this.masterGain = master;

    const configs = this.makeConfigs(energy, environment, emotion);

    configs.forEach((cfg) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = cfg.type;
      osc.frequency.value = cfg.frequency;
      osc.detune.value = cfg.detune;

      filter.type = 'lowpass';
      filter.frequency.value = lerp(400, 2000, energy / 100);
      filter.Q.value = 0.5;

      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(cfg.volume, ctx.currentTime + 3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
      this.filters.push(filter);
    });

    // Slow LFO modulation
    this.lfoInterval = setInterval(() => {
      const now = ctx.currentTime;
      this.gains.forEach((g, i) => {
        const base = configs[i].volume;
        const mod = base * 0.3 * Math.sin(Date.now() / 4000 + i);
        g.gain.linearRampToValueAtTime(Math.max(0.001, base + mod), now + 0.5);
      });
      this.filters.forEach((f) => {
        const base = lerp(400, 2000, energy / 100);
        const mod = base * 0.2 * Math.sin(Date.now() / 6000);
        f.frequency.linearRampToValueAtTime(Math.max(200, base + mod), now + 0.5);
      });
    }, 500);

    this.isPlaying = true;
  }

  stop() {
    if (this.lfoInterval) {
      clearInterval(this.lfoInterval);
      this.lfoInterval = null;
    }

    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      const now = ctx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0, now + 2);

      setTimeout(() => {
        this.oscillators.forEach((o) => o.stop());
        this.oscillators = [];
        this.gains = [];
        this.filters = [];
        this.masterGain?.disconnect();
        this.masterGain = null;
      }, 2100);
    }

    this.isPlaying = false;
  }

  toggle(energy: number, environment: string, emotion: string) {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play(energy, environment, emotion);
    }
  }
}
