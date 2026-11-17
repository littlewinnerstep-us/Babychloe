// Web Audio + HTMLAudio singleton engine for sanctuary music and weather/pet ambience
// Strictly plays only when the app is active in the foreground.

let audioCtx = null;
let musicAudioEl = null;
let currentMusicSrc = '';
let savedMusicUrl = '';
let chimeTimer = null;

let noiseBuffer = null;
let weatherNode = null;
let weatherGain = null;

let isSoundEnabled = false;
let currentWeather = 'clear';
let isAppForeground =
  typeof document === 'undefined'
    ? true
    : document.visibilityState === 'visible' &&
      (typeof document.hasFocus !== 'function' || document.hasFocus());

function isAppActive() {
  if (!isAppForeground) return false;
  if (typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible')) {
    return false;
  }
  return true;
}

function ensureContext() {
  if (typeof window === 'undefined' || !isAppActive()) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

function stopChimeLoop() {
  if (chimeTimer) {
    clearInterval(chimeTimer);
    chimeTimer = null;
  }
}

function startBuiltInHarpLoop() {
  stopChimeLoop();
  if (!isSoundEnabled || !isAppActive()) return;
  const ctx = ensureContext();
  if (!ctx) return;

  // Serene C-major pentatonic sanctuary notes
  const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  let step = 0;

  const playNote = () => {
    if (!isSoundEnabled || !isAppActive() || currentMusicSrc) return;
    const c = ensureContext();
    if (!c) return;
    const freq = notes[(step * 3 + (step % 2)) % notes.length];
    step += 1;

    const now = c.currentTime;
    const osc = c.createOscillator();
    const osc2 = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.7);
    osc2.stop(now + 2.7);
  };

  playNote();
  chimeTimer = setInterval(playNote, 1750);
}

function stopWeatherAmbience() {
  if (weatherNode) {
    try {
      weatherNode.stop();
      weatherNode.disconnect();
    } catch {
      // ignore
    }
    weatherNode = null;
  }
  if (weatherGain) {
    try {
      weatherGain.disconnect();
    } catch {
      // ignore
    }
    weatherGain = null;
  }
}

function startWeatherAmbience(weather) {
  stopWeatherAmbience();
  if (!isSoundEnabled || !isAppActive()) return;
  if (weather !== 'rain' && weather !== 'thunderstorm' && weather !== 'windy') return;

  const ctx = ensureContext();
  if (!ctx) return;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  if (weather === 'windy') {
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 1.6;
    gain.gain.value = 0.055;
  } else {
    filter.type = 'lowpass';
    filter.frequency.value = weather === 'thunderstorm' ? 1450 : 1150;
    gain.gain.value = weather === 'thunderstorm' ? 0.095 : 0.075;
  }

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();

  weatherNode = src;
  weatherGain = gain;
}

function stopCustomMusicEl() {
  if (musicAudioEl) {
    try {
      musicAudioEl.pause();
    } catch {
      // ignore
    }
  }
}

let howlTimeout = null;
let nextBarkAllowedAt = 0;

function clearPendingHowl() {
  if (howlTimeout) {
    clearTimeout(howlTimeout);
    howlTimeout = null;
  }
}

function syncActiveAudio() {
  if (!isSoundEnabled || !isAppActive()) {
    clearPendingHowl();
    stopChimeLoop();
    stopCustomMusicEl();
    stopWeatherAmbience();
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {});
    }
    return;
  }

  ensureContext();

  if (savedMusicUrl) {
    stopChimeLoop();
    if (!musicAudioEl) {
      musicAudioEl = new Audio();
      musicAudioEl.loop = true;
      musicAudioEl.volume = 0.45;
    }
    if (currentMusicSrc !== savedMusicUrl) {
      currentMusicSrc = savedMusicUrl;
      musicAudioEl.src = savedMusicUrl;
    }
    musicAudioEl.play().catch(() => {
      currentMusicSrc = '';
      startBuiltInHarpLoop();
    });
  } else {
    currentMusicSrc = '';
    stopCustomMusicEl();
    if (!chimeTimer) {
      startBuiltInHarpLoop();
    }
  }

  startWeatherAmbience(currentWeather);
}

function setAppForeground(active) {
  isAppForeground = Boolean(active);
  syncActiveAudio();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.__evergreenSetAppForeground = setAppForeground;

  document.addEventListener('visibilitychange', () => {
    setAppForeground(!document.hidden && document.visibilityState === 'visible');
  });
  window.addEventListener('blur', () => setAppForeground(false));
  window.addEventListener('pagehide', () => setAppForeground(false));
  window.addEventListener('focus', () => {
    setAppForeground(!document.hidden && document.visibilityState === 'visible');
  });
  window.addEventListener('pageshow', () => {
    setAppForeground(!document.hidden && document.visibilityState === 'visible');
  });
}

export function setSoundState({ enabled, musicUrl = '', weather = 'clear' }) {
  isSoundEnabled = Boolean(enabled);
  savedMusicUrl = (musicUrl || '').trim();
  currentWeather = weather;
  syncActiveAudio();
}

export function playThunderSound() {
  if (!isSoundEnabled || !isAppActive()) return;
  const ctx = ensureContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, now);
  filter.frequency.exponentialRampToValueAtTime(52, now + 2.4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.14);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  src.start(now);
  src.stop(now + 2.7);
}

function connectWithDistantEcho(ctx, sourceNode, destNode) {
  const delay = ctx.createDelay(0.5);
  delay.delayTime.value = 0.22;
  const echoFilter = ctx.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.value = 360;
  const echoGain = ctx.createGain();
  echoGain.gain.value = 0.28;

  sourceNode.connect(destNode);
  sourceNode.connect(delay);
  delay.connect(echoFilter);
  echoFilter.connect(echoGain);
  echoGain.connect(destNode);
}

export function playDogBarkAndHowl() {
  if (!isSoundEnabled || !isAppActive()) return;
  const nowMs = Date.now();
  if (nowMs < nextBarkAllowedAt) return;
  nextBarkAllowedAt = nowMs + 4500;

  const ctx = ensureContext();
  if (!ctx) return;

  clearPendingHowl();
  const now = ctx.currentTime;

  // Soft far-away barks ("arf-woof") within 0 - 0.35s
  [0, 0.19].forEach((offset, idx) => {
    const start = now + offset;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(idx === 0 ? 310 : 275, start);
    osc.frequency.exponentialRampToValueAtTime(135, start + 0.13);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(440, start);

    gain.gain.setValueAtTime(0.0005, start);
    gain.gain.linearRampToValueAtTime(0.016, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    connectWithDistantEcho(ctx, gain, ctx.destination);

    osc.start(start);
    osc.stop(start + 0.17);
  });

  // 2-second silent pause, then soft far-away howl
  howlTimeout = setTimeout(() => {
    howlTimeout = null;
    if (!isSoundEnabled || !isAppActive()) return;
    const c = ensureContext();
    if (!c) return;

    const howlStart = c.currentTime;
    const howlOsc = c.createOscillator();
    const howlSub = c.createOscillator();
    const howlFilter = c.createBiquadFilter();
    const howlGain = c.createGain();

    howlOsc.type = 'triangle';
    howlSub.type = 'sine';

    howlOsc.frequency.setValueAtTime(240, howlStart);
    howlOsc.frequency.exponentialRampToValueAtTime(410, howlStart + 0.52);
    howlOsc.frequency.exponentialRampToValueAtTime(270, howlStart + 1.72);

    howlSub.frequency.setValueAtTime(240, howlStart);
    howlSub.frequency.exponentialRampToValueAtTime(410, howlStart + 0.52);
    howlSub.frequency.exponentialRampToValueAtTime(270, howlStart + 1.72);

    howlFilter.type = 'lowpass';
    howlFilter.frequency.setValueAtTime(460, howlStart);

    howlGain.gain.setValueAtTime(0.0005, howlStart);
    howlGain.gain.linearRampToValueAtTime(0.014, howlStart + 0.34);
    howlGain.gain.setValueAtTime(0.012, howlStart + 1.05);
    howlGain.gain.exponentialRampToValueAtTime(0.0005, howlStart + 1.82);

    howlOsc.connect(howlFilter);
    howlSub.connect(howlFilter);
    howlFilter.connect(howlGain);
    connectWithDistantEcho(c, howlGain, c.destination);

    howlOsc.start(howlStart);
    howlSub.start(howlStart);
    howlOsc.stop(howlStart + 1.88);
    howlSub.stop(howlStart + 1.88);
  }, 2350);
}
