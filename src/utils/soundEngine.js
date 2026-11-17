// Web Audio + HTMLAudio singleton engine for sanctuary music and weather/pet ambience
// Strictly plays only when the app is active in the foreground.
// Includes iOS/macOS Safari WebKit gesture unlocking, silent-buffer prime, and resume callbacks.

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
let isAppForeground = typeof document === 'undefined' ? true : !document.hidden;

function isAppActive() {
  if (!isAppForeground) return false;
  if (typeof document !== 'undefined' && document.hidden) {
    return false;
  }
  return true;
}

function getAudioContextClass() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function primeSilentBuffer(ctx) {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (typeof source.start === 'function') {
      source.start(0);
    } else if (typeof source.noteOn === 'function') {
      source.noteOn(0);
    }
  } catch {
    // ignore if already primed or context not ready
  }
}

function ensureContext(resumeIfSuspended = true) {
  if (typeof window === 'undefined' || !isAppActive()) return null;
  if (!audioCtx) {
    const Ctx = getAudioContextClass();
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (resumeIfSuspended && audioCtx.state !== 'running') {
    audioCtx
      .resume()
      .then(() => {
        if (isSoundEnabled && isAppActive()) {
          if (!savedMusicUrl && !chimeTimer) {
            startBuiltInHarpLoop();
          }
          if (!weatherNode && (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'windy')) {
            startWeatherAmbience(currentWeather);
          }
        }
      })
      .catch(() => {});
  }
  return audioCtx;
}

export function unlockAudioFromGesture() {
  if (typeof window === 'undefined') return;
  isAppForeground = typeof document === 'undefined' ? true : !document.hidden;

  const Ctx = getAudioContextClass();
  if (Ctx) {
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    primeSilentBuffer(audioCtx);
    if (audioCtx.state !== 'running') {
      audioCtx
        .resume()
        .then(() => {
          if (isSoundEnabled && isAppActive()) {
            syncActiveAudio();
          }
        })
        .catch(() => {});
    }
  }

  if (savedMusicUrl && musicAudioEl && musicAudioEl.paused && isSoundEnabled) {
    musicAudioEl.play().catch(() => {});
  }
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
    if (!isSoundEnabled || !isAppActive() || savedMusicUrl) return;
    const c = ensureContext(false);
    if (!c) return;
    if (c.state !== 'running') {
      c.resume().catch(() => {});
      return;
    }

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
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(c.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 2.7);
    osc2.stop(now + 2.7);
  };

  if (ctx.state === 'running') {
    playNote();
  } else {
    ctx
      .resume()
      .then(() => {
        if (isSoundEnabled && isAppActive() && !savedMusicUrl) {
          playNote();
        }
      })
      .catch(() => {});
  }
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
    filter.frequency.value = 380;
    filter.Q.value = 1.5;
    gain.gain.value = 0.075;
  } else {
    filter.type = 'lowpass';
    filter.frequency.value = weather === 'thunderstorm' ? 1550 : 1250;
    gain.gain.value = weather === 'thunderstorm' ? 0.11 : 0.09;
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
      musicAudioEl.volume = 0.5;
      musicAudioEl.playsInline = true;
      musicAudioEl.preload = 'auto';
      musicAudioEl.setAttribute('playsinline', '');
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
  window.addEventListener('pagehide', () => setAppForeground(false));
  window.addEventListener('focus', () => {
    setAppForeground(!document.hidden);
  });
  window.addEventListener('pageshow', () => {
    setAppForeground(!document.hidden);
  });

  const handleUserGesture = () => {
    isAppForeground = !document.hidden;
    if (isSoundEnabled && isAppActive()) {
      unlockAudioFromGesture();
    }
  };
  window.addEventListener('pointerdown', handleUserGesture, { passive: true });
  window.addEventListener('touchstart', handleUserGesture, { passive: true });
  window.addEventListener('touchend', handleUserGesture, { passive: true });
  window.addEventListener('click', handleUserGesture, { passive: true });
  window.addEventListener('keydown', handleUserGesture, { passive: true });
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

  const triggerThunder = (c) => {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c);
    src.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, now);
    filter.frequency.exponentialRampToValueAtTime(58, now + 2.4);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.36, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    src.start(now);
    src.stop(now + 2.7);
  };

  if (ctx.state === 'running') {
    triggerThunder(ctx);
  } else {
    ctx
      .resume()
      .then(() => {
        if (isSoundEnabled && isAppActive()) triggerThunder(ctx);
      })
      .catch(() => {});
  }
}

function connectWithDistantEcho(ctx, sourceNode, destNode) {
  // 2-tap distant valley echo so the call carries from afar cleanly on phone speakers
  const delay1 = ctx.createDelay(0.7);
  delay1.delayTime.value = 0.22;
  const delay2 = ctx.createDelay(0.7);
  delay2.delayTime.value = 0.45;

  const echoFilter1 = ctx.createBiquadFilter();
  echoFilter1.type = 'lowpass';
  echoFilter1.frequency.value = 640;

  const echoFilter2 = ctx.createBiquadFilter();
  echoFilter2.type = 'lowpass';
  echoFilter2.frequency.value = 500;

  const echoGain1 = ctx.createGain();
  echoGain1.gain.value = 0.34;
  const echoGain2 = ctx.createGain();
  echoGain2.gain.value = 0.18;

  sourceNode.connect(destNode);

  sourceNode.connect(delay1);
  delay1.connect(echoFilter1);
  echoFilter1.connect(echoGain1);
  echoGain1.connect(destNode);

  sourceNode.connect(delay2);
  delay2.connect(echoFilter2);
  echoFilter2.connect(echoGain2);
  echoGain2.connect(destNode);
}

function triggerBarkAndHowl(ctx) {
  clearPendingHowl();
  const now = ctx.currentTime;

  // Soft far-away barks ("arf-woof") within 0 - 0.35s
  [0, 0.19].forEach((offset, idx) => {
    const start = now + offset;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(idx === 0 ? 330 : 290, start);
    osc.frequency.exponentialRampToValueAtTime(145, start + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, start);

    gain.gain.setValueAtTime(0.0005, start);
    gain.gain.linearRampToValueAtTime(0.052, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    connectWithDistantEcho(ctx, gain, ctx.destination);

    osc.start(start);
    osc.stop(start + 0.18);
  });

  // 2-second silent pause, then soft far-away 1.8s howl
  howlTimeout = setTimeout(() => {
    howlTimeout = null;
    if (!isSoundEnabled || !isAppActive()) return;
    const c = ensureContext();
    if (!c) return;

    const playHowl = (hc) => {
      const howlStart = hc.currentTime;
      const howlOsc = hc.createOscillator();
      const howlSub = hc.createOscillator();
      const howlFilter = hc.createBiquadFilter();
      const howlGain = hc.createGain();

      howlOsc.type = 'triangle';
      howlSub.type = 'sine';

      howlOsc.frequency.setValueAtTime(255, howlStart);
      howlOsc.frequency.exponentialRampToValueAtTime(430, howlStart + 0.52);
      howlOsc.frequency.exponentialRampToValueAtTime(280, howlStart + 1.72);

      howlSub.frequency.setValueAtTime(255, howlStart);
      howlSub.frequency.exponentialRampToValueAtTime(430, howlStart + 0.52);
      howlSub.frequency.exponentialRampToValueAtTime(280, howlStart + 1.72);

      howlFilter.type = 'lowpass';
      howlFilter.frequency.setValueAtTime(760, howlStart);

      howlGain.gain.setValueAtTime(0.0005, howlStart);
      howlGain.gain.linearRampToValueAtTime(0.048, howlStart + 0.34);
      howlGain.gain.setValueAtTime(0.042, howlStart + 1.05);
      howlGain.gain.exponentialRampToValueAtTime(0.0005, howlStart + 1.82);

      howlOsc.connect(howlFilter);
      howlSub.connect(howlFilter);
      howlFilter.connect(howlGain);
      connectWithDistantEcho(hc, howlGain, hc.destination);

      howlOsc.start(howlStart);
      howlSub.start(howlStart);
      howlOsc.stop(howlStart + 1.88);
      howlSub.stop(howlStart + 1.88);
    };

    if (c.state === 'running') {
      playHowl(c);
    } else {
      c.resume()
        .then(() => {
          if (isSoundEnabled && isAppActive()) playHowl(c);
        })
        .catch(() => {});
    }
  }, 2350);
}

export function playDogBarkAndHowl(force = false) {
  if (!isSoundEnabled || !isAppActive()) return;
  const nowMs = Date.now();
  if (!force && nowMs < nextBarkAllowedAt) return;
  nextBarkAllowedAt = nowMs + 4500;

  const ctx = ensureContext();
  if (!ctx) return;

  if (ctx.state === 'running') {
    triggerBarkAndHowl(ctx);
  } else {
    ctx
      .resume()
      .then(() => {
        if (isSoundEnabled && isAppActive()) triggerBarkAndHowl(ctx);
      })
      .catch(() => {});
  }
}
