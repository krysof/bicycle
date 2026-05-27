const MASTER_GAIN = 0.62;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeNoiseBuffer(ctx, seconds = 1) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function makeMusicBuffer(ctx, seconds = 64) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];
  const bass = [130.81, 146.83, 164.81, 196.0];
  const beatSeconds = 2.0;

  for (let i = 0; i < length; i += 1) {
    const time = i / sampleRate;
    const bar = Math.floor(time / 8);
    const beat = Math.floor(time / beatSeconds);
    const phaseInBeat = (time % beatSeconds) / beatSeconds;
    const env = Math.sin(Math.PI * phaseInBeat) ** 1.8;
    const melodyFreq = notes[(beat + bar) % notes.length];
    const harmonyFreq = notes[(beat + 2) % notes.length] / 2;
    const bassFreq = bass[Math.floor(time / 16) % bass.length];

    const melody = Math.sin(2 * Math.PI * melodyFreq * time) * env * 0.075;
    const harmony = Math.sin(2 * Math.PI * harmonyFreq * time + 0.4) * env * 0.035;
    const bassTone = Math.sin(2 * Math.PI * bassFreq * time) * (0.45 + env * 0.2) * 0.035;
    const pad = Math.sin(2 * Math.PI * (bassFreq * 1.5) * time + Math.sin(time * 0.18)) * 0.018;
    const fadeIn = clamp(time / 3.0, 0, 1);
    const fadeOut = clamp((seconds - time) / 4.0, 0, 1);
    const value = (melody + harmony + bassTone + pad) * fadeIn * fadeOut;
    left[i] = value * 0.92;
    right[i] = value * 0.86 + Math.sin(2 * Math.PI * (melodyFreq * 2) * time) * env * 0.006;
  }
  return buffer;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.started = false;
    this.musicSource = null;
    this.windSource = null;
    this.birdTimer = 0;
    this.petalTimer = 0;
    this.pedalTimer = 0;
    this.lastDeliveredCount = 0;
    this.wasFlying = false;
    this.isEnabled = false;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.46;
    this.musicGain.connect(this.master);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.34;
    this.ambientGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.82;
    this.sfxGain.connect(this.master);

    this.noiseBuffer = makeNoiseBuffer(this.ctx, 2);
    return this.ctx;
  }

  async start() {
    const ctx = this.ensure();
    if (!ctx) return;
    const wasStarted = this.started;
    // Sources are created directly from the user's click path so browser
    // autoplay policies treat this as an intentional sound start.
    if (!this.started) {
      this.started = true;
      this.isEnabled = true;
      this.startMusic();
      this.startNatureBed();
    }
    if (ctx.state === "suspended") await ctx.resume();
    if (!wasStarted) this.playEnableChime();
  }

  playEnableChime() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(523.25, now, 0.16, 0.06, "sine");
    this.tone(659.25, now + 0.12, 0.18, 0.055, "sine");
  }

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicSource) return;
    const source = ctx.createBufferSource();
    source.buffer = makeMusicBuffer(ctx, 64);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    source.connect(filter);
    filter.connect(this.musicGain);
    source.start();
    this.musicSource = source;
  }

  startNatureBed() {
    const ctx = this.ensure();
    if (!ctx || this.windSource) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 640;
    filter.Q.value = 0.55;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    source.start();
    this.windSource = source;
  }

  tone(freq, start, duration, gainValue, type = "sine", destination = this.sfxGain) {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  noiseTap(start, duration, gainValue, filterFreq = 900, filterType = "bandpass") {
    const ctx = this.ensure();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  playThrow() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseTap(now, 0.22, 0.12, 1450, "bandpass");
    this.tone(520, now, 0.16, 0.045, "triangle");
    this.tone(780, now + 0.07, 0.14, 0.035, "sine");
  }

  playSuccess() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseTap(now, 0.12, 0.09, 260, "lowpass");
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.tone(freq, now + 0.08 + i * 0.08, 0.34, 0.04, "sine");
    });
  }

  playHint() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(392, now, 0.16, 0.025, "triangle");
    this.tone(330, now + 0.13, 0.18, 0.022, "triangle");
  }

  playPedal(speed = 1) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const volume = clamp(0.025 + speed * 0.035, 0.025, 0.065);
    this.noiseTap(now, 0.055, volume, 520, "bandpass");
    this.tone(95, now, 0.07, volume * 0.42, "sine");
  }

  playBird() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 1200 + Math.random() * 360;
    this.tone(base, now, 0.09, 0.012, "sine", this.ambientGain);
    this.tone(base * 1.18, now + 0.1, 0.11, 0.01, "sine", this.ambientGain);
  }

  playPetalRustle() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.noiseTap(ctx.currentTime, 0.32, 0.018, 2100, "highpass");
  }

  update(state, dt) {
    if (!this.started || !this.ctx) return;
    const movingForward = state.keys?.has("arrowup") || state.keys?.has("w");
    const movingBack = state.keys?.has("arrowdown") || state.keys?.has("s");
    const bike = state.config?.moveMode === "bike";
    const moving = state.isPlaying && !state.isPaused && bike && (movingForward || movingBack);
    if (moving) {
      const interval = movingForward ? 0.46 : 0.7;
      this.pedalTimer -= dt;
      if (this.pedalTimer <= 0) {
        this.playPedal(movingForward ? 1 : 0.45);
        this.pedalTimer = interval;
      }
    } else {
      this.pedalTimer = 0;
    }

    const flying = Boolean(state.delivery?.active);
    if (flying && !this.wasFlying) this.playThrow();
    this.wasFlying = flying;

    if (state.delivered?.length > this.lastDeliveredCount) {
      this.playSuccess();
      this.lastDeliveredCount = state.delivered.length;
    }

    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.playBird();
      this.birdTimer = 7 + Math.random() * 8;
    }

    this.petalTimer -= dt;
    if (this.petalTimer <= 0) {
      this.playPetalRustle();
      this.petalTimer = 5 + Math.random() * 7;
    }
  }
}
