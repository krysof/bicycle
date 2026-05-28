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

function makeMusicBuffer(ctx, seconds = 60) {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  // 1 分钟无缝循环：96 拍 / 分，正好 96 拍，避免循环空档。
  const melody = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 659.25, 783.99, 987.77, 880.0];
  const chords = [
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [329.63, 392.0, 493.88],
    [196.0, 261.63, 329.63],
  ];
  const beatSeconds = 60 / 96;

  function pluck(freq, time, decay = 3.8) {
    const local = time % beatSeconds;
    const env = Math.exp(-local * decay) * Math.max(0, 1 - local / beatSeconds);
    return (
      Math.sin(2 * Math.PI * freq * time) * 0.55 +
      Math.sin(2 * Math.PI * freq * 2.01 * time) * 0.21 +
      Math.sin(2 * Math.PI * freq * 3.0 * time) * 0.08
    ) * env;
  }

  for (let i = 0; i < length; i += 1) {
    const time = i / sampleRate;
    const beat = Math.floor(time / beatSeconds);
    const bar = Math.floor(beat / 4);
    const beatPhase = (time % beatSeconds) / beatSeconds;
    const barPhase = (time % (beatSeconds * 4)) / (beatSeconds * 4);
    const melodyFreq = melody[(beat + Math.floor(bar / 2)) % melody.length];
    const chord = chords[bar % chords.length];
    const chordEnv = 0.55 + 0.45 * Math.sin(Math.PI * barPhase);
    const chordTone = chord.reduce((sum, freq, idx) => {
      return sum + Math.sin(2 * Math.PI * freq * time + idx * 0.42) * (0.017 / (idx + 1));
    }, 0) * chordEnv;

    const mallet = pluck(melodyFreq, time, 5.2) * 0.075;
    const answer = beat % 4 === 2 ? pluck(melody[(beat + 5) % melody.length] * 0.5, time, 4.6) * 0.035 : 0;
    const bassRoot = chord[0] / 2;
    const bassPulse = Math.exp(-beatPhase * 4.0) * Math.sin(2 * Math.PI * bassRoot * time) * 0.032;
    const lightRhythm = (Math.sin(2 * Math.PI * 1760 * time) + Math.sin(2 * Math.PI * 2217 * time) * 0.35)
      * Math.exp(-beatPhase * 18) * (beat % 2 === 0 ? 0.012 : 0.006);
    const slowAir = Math.sin(2 * Math.PI * 392 * time + Math.sin(time * 0.22) * 0.8) * 0.008;

    const value = chordTone + mallet + answer + bassPulse + lightRhythm + slowAir;
    const pan = Math.sin(time * 0.18) * 0.12;
    left[i] = value * (0.92 - pan);
    right[i] = value * (0.92 + pan);
  }

  // 末尾和开头做极短交叉匹配，循环点听不到“空档”或明显点击声。
  const crossfade = Math.floor(sampleRate * 0.035);
  for (let i = 0; i < crossfade; i += 1) {
    const a = i / crossfade;
    const b = 1 - a;
    const tail = length - crossfade + i;
    left[tail] = left[tail] * b + left[i] * a;
    right[tail] = right[tail] * b + right[i] * a;
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
    this.walkTimer = 0;
    this.passerStepTimer = 1.2;
    this.passerBikeTimer = 1.8;
    this.animalTimer = 2.4;
    this.insectTimer = 1.6;
    this.lastDeliveredCount = 0;
    this.wasFlying = false;
    this.isEnabled = false;
    this.musicEnabled = localStorage.getItem("bicycle-music") !== "off";
    this.sfxEnabled = localStorage.getItem("bicycle-sfx") !== "off";
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
    this.musicGain.gain.value = this.musicEnabled ? 0.42 : 0.0001;
    this.musicGain.connect(this.master);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = this.musicEnabled ? 0.50 : 0.0001;
    this.ambientGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 1.05 : 0.0001;
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
    if (!wasStarted && this.sfxEnabled) this.playEnableChime();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    localStorage.setItem("bicycle-music", this.musicEnabled ? "on" : "off");
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.musicGain?.gain.setTargetAtTime(this.musicEnabled ? 0.42 : 0.0001, now, 0.08);
    this.ambientGain?.gain.setTargetAtTime(this.musicEnabled ? 0.50 : 0.0001, now, 0.08);
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    localStorage.setItem("bicycle-sfx", this.sfxEnabled ? "on" : "off");
    const ctx = this.ensure();
    if (!ctx) return;
    this.sfxGain?.gain.setTargetAtTime(this.sfxEnabled ? 1.05 : 0.0001, ctx.currentTime, 0.04);
    if (this.sfxEnabled) window.setTimeout(() => this.playEnableChime(), 80);
  }

  toggleMusic() {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  toggleSfx() {
    this.setSfxEnabled(!this.sfxEnabled);
    return this.sfxEnabled;
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
    source.buffer = makeMusicBuffer(ctx, 60);
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
    gain.gain.value = 0.052;
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

  noiseTap(start, duration, gainValue, filterFreq = 900, filterType = "bandpass", destination = this.sfxGain) {
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
    gain.connect(destination);
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
    const volume = clamp(0.045 + speed * 0.055, 0.045, 0.105);
    this.noiseTap(now, 0.07, volume, 580, "bandpass");
    this.tone(95, now, 0.09, volume * 0.58, "sine");
    this.tone(185, now + 0.018, 0.06, volume * 0.22, "triangle");
  }

  playFootstep(speed = 1, distant = false) {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const volume = distant ? clamp(0.012 + speed * 0.010, 0.011, 0.026) : clamp(0.045 + speed * 0.035, 0.04, 0.082);
    this.noiseTap(now, distant ? 0.055 : 0.075, volume, distant ? 390 : 470, "lowpass");
    if (!distant) this.tone(115, now, 0.055, volume * 0.44, "sine");
  }

  playAmbientBikePass() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.noiseTap(now, 0.15, 0.026, 680, "bandpass", this.ambientGain);
    this.tone(105 + Math.random() * 28, now, 0.15, 0.014, "sine", this.ambientGain);
    this.tone(170 + Math.random() * 35, now + 0.08, 0.11, 0.009, "triangle", this.ambientGain);
  }

  playAnimalSound() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pick = Math.random();
    if (pick < 0.34) {
      this.tone(640, now, 0.13, 0.022, "triangle", this.ambientGain);
      this.tone(820, now + 0.10, 0.11, 0.018, "triangle", this.ambientGain);
    } else if (pick < 0.68) {
      this.tone(260, now, 0.12, 0.024, "sine", this.ambientGain);
      this.tone(210, now + 0.13, 0.13, 0.018, "sine", this.ambientGain);
    } else {
      this.noiseTap(now, 0.18, 0.021, 760, "bandpass", this.ambientGain);
      this.tone(480 + Math.random() * 180, now + 0.03, 0.09, 0.014, "sine", this.ambientGain);
    }
  }

  playInsectWing() {
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 1850 + Math.random() * 900;
    this.tone(base, now, 0.09, 0.009, "triangle", this.ambientGain);
    this.tone(base * 1.52, now + 0.04, 0.07, 0.006, "sine", this.ambientGain);
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

  update(state, dt, ambientInfo = null) {
    if (!this.started || !this.ctx) return;
    const movingForward = state.keys?.has("arrowup") || state.keys?.has("w") || (state.touchThrottle || 0) > 0.05;
    const movingBack = state.keys?.has("arrowdown") || state.keys?.has("s") || (state.touchThrottle || 0) < -0.05;
    const bike = state.config?.moveMode === "bike";
    const walk = state.config?.moveMode === "walk";
    const moving = state.isPlaying && !state.isPaused && (movingForward || movingBack);
    const biking = moving && bike;
    const walking = moving && walk;
    if (biking) {
      const interval = movingForward ? 0.34 : 0.52;
      this.pedalTimer -= dt;
      if (this.pedalTimer <= 0) {
        this.playPedal(movingForward ? 1 : 0.45);
        this.pedalTimer = interval;
      }
    } else {
      this.pedalTimer = 0;
    }
    if (walking) {
      const interval = movingForward ? 0.44 : 0.58;
      this.walkTimer -= dt;
      if (this.walkTimer <= 0) {
        this.playFootstep(movingForward ? 1 : 0.62, false);
        this.walkTimer = interval;
      }
    } else {
      this.walkTimer = 0;
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

    const playing = state.isPlaying && !state.isPaused;
    if (!playing) return;

    const pedestrianCount = ambientInfo?.pedestrianCount ?? 0;
    const cyclistCount = ambientInfo?.cyclistCount ?? 0;
    const animalCount = ambientInfo?.animalCount ?? 0;
    const insectCount = ambientInfo?.insectCount ?? 0;
    const near = ambientInfo?.nearPasserby;

    this.passerStepTimer -= dt;
    if (pedestrianCount > 0 && this.passerStepTimer <= 0) {
      const nearBoost = near === "pedestrian" ? 0.75 : 1;
      this.playFootstep(0.55, true);
      this.passerStepTimer = (1.2 + Math.random() * 1.1) * nearBoost / clamp(pedestrianCount / 18, 0.75, 1.35);
    }

    this.passerBikeTimer -= dt;
    if (cyclistCount > 0 && this.passerBikeTimer <= 0) {
      this.playAmbientBikePass();
      this.passerBikeTimer = (2.0 + Math.random() * 2.2) / clamp(cyclistCount / 6, 0.75, 1.45);
    }

    this.animalTimer -= dt;
    if (animalCount > 0 && this.animalTimer <= 0) {
      this.playAnimalSound();
      this.animalTimer = (3.0 + Math.random() * 4.5) / clamp(animalCount / 8, 0.8, 1.35);
    }

    this.insectTimer -= dt;
    if (insectCount > 0 && this.insectTimer <= 0) {
      this.playInsectWing();
      this.insectTimer = (1.8 + Math.random() * 2.4) / clamp(insectCount / 14, 0.85, 1.35);
    }
  }
}
