// HTML5 <audio> PCM WAV synthesizer & playback engine for Safari (iOS/macOS), Android WebView & Desktop.
// Uses synthesized 16-bit PCM WAV data URIs inside <audio playsinline> media elements so iPhone Safari
// plays cleanly through AVAudioSession "playback" even when the physical Silent/Ring switch is ON.
// Strictly plays only while the app is active in the foreground.

const SAMPLE_RATE = 16000;

let harpUriCache = null;
const weatherUriCache = {};
let barkHowlUriCache = null;
let owlUriCache = null;
let thunderUriCache = null;

let musicEl = null;
let weatherEl = null;
let barkEl = null;
let owlEl = null;
let thunderEl = null;

let currentMusicSrc = '';
let currentWeatherSrc = '';
let savedMusicUrl = '';

let isSoundEnabled = true;
let isWeatherSoundEnabled = true;
let currentWeather = 'clear';
let currentRoom = 'tombstone';
let isAppForeground = typeof document === 'undefined' ? true : !document.hidden;

let audioUnlocked = false;
let unlockedAtMs = 0;
let barkPlayGen = 0;
let owlPlayGen = 0;
let thunderPlayGen = 0;
let nextBarkAllowedAt = 0;
let nextOwlAllowedAt = 0;
let natureCallTimer = null;
let nextNatureCallIsOwl = false;

function isAppActive() {
  if (!isAppForeground) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  return true;
}

function setPlaybackAudioSession() {
  try {
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      navigator.audioSession.type = 'playback';
    }
  } catch {
    // ignore on browsers without navigator.audioSession
  }
}

function createMediaEl(loop, volume) {
  const el = new Audio();
  el.loop = loop;
  el.volume = volume;
  el.playsInline = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  return el;
}

function ensureElements() {
  if (typeof window === 'undefined') return;
  if (!musicEl) musicEl = createMediaEl(true, 0.65);
  if (!weatherEl) weatherEl = createMediaEl(true, 0.45);
  if (!barkEl) barkEl = createMediaEl(false, 0.55);
  if (!owlEl) owlEl = createMediaEl(false, 0.5);
  if (!thunderEl) thunderEl = createMediaEl(false, 0.7);
}

function encodeWavDataUri(samples, sampleRate = SAMPLE_RATE) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      bytes[offset + i] = str.charCodeAt(i);
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i += 1) {
    let s = samples[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getHarpLoopUri() {
  if (harpUriCache) return harpUriCache;

  const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 587.33, 440.0];
  const noteSec = 1.4;
  const samplesPerNote = Math.floor(SAMPLE_RATE * noteSec);
  const totalSamples = notes.length * samplesPerNote;
  const dry = new Float32Array(totalSamples);

  for (let n = 0; n < notes.length; n += 1) {
    const freq = notes[n];
    const startIdx = n * samplesPerNote;
    for (let j = 0; j < samplesPerNote; j += 1) {
      const t = j / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.025);
      const env = attack * Math.exp(-t * 2.4);
      const tone =
        0.65 * Math.sin(2 * Math.PI * freq * t) +
        0.24 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 1.4) +
        0.11 * Math.sin(2 * Math.PI * freq * 3 * t) * Math.exp(-t * 2.5);
      dry[startIdx + j] += tone * env * 0.28;
    }
  }

  const out = new Float32Array(totalSamples);
  const delaySamples = Math.floor(SAMPLE_RATE * 0.28);
  const delaySamples2 = Math.floor(SAMPLE_RATE * 0.56);
  for (let i = 0; i < totalSamples; i += 1) {
    const d1 = dry[(i - delaySamples + totalSamples) % totalSamples];
    const d2 = dry[(i - delaySamples2 + totalSamples) % totalSamples];
    out[i] = dry[i] + d1 * 0.32 + d2 * 0.14;
  }

  let maxAbs = 0.001;
  for (let i = 0; i < totalSamples; i += 1) {
    const a = Math.abs(out[i]);
    if (a > maxAbs) maxAbs = a;
  }
  const scale = 0.35 / maxAbs;
  for (let i = 0; i < totalSamples; i += 1) {
    out[i] *= scale;
  }

  harpUriCache = encodeWavDataUri(out, SAMPLE_RATE);
  return harpUriCache;
}

function getWeatherUri(weather) {
  if (weatherUriCache[weather]) return weatherUriCache[weather];

  const duration = 4.0;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const raw = new Float32Array(totalSamples);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let rumble = 0;

  for (let i = 0; i < totalSamples; i += 1) {
    const white = Math.random() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.029;
    b1 = 0.985 * b1 + white * 0.032;
    b2 = 0.95 * b2 + white * 0.048;
    const pink = b0 + b1 + b2 + white * 0.08;

    const t = i / SAMPLE_RATE;
    if (weather === 'windy') {
      const lfo = 0.45 + 0.35 * Math.sin(2 * Math.PI * 0.25 * t) + 0.2 * Math.sin(2 * Math.PI * 0.75 * t);
      const rustle = Math.max(0, Math.sin(2 * Math.PI * 0.5 * t)) * white * 0.035;
      raw[i] = (pink * 0.24 * lfo + rustle) * 0.55;
    } else if (weather === 'thunderstorm') {
      rumble = 0.996 * rumble + (Math.random() * 2 - 1) * 0.05;
      const rumbleLfo = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.5 * t);
      raw[i] = pink * 0.26 + white * 0.045 + rumble * rumbleLfo * 0.42;
    } else {
      raw[i] = pink * 0.22 + white * 0.038;
    }
  }

  if (weather === 'rain' || weather === 'thunderstorm') {
    const drops = weather === 'thunderstorm' ? 42 : 28;
    for (let d = 0; d < drops; d += 1) {
      const pos = Math.floor(Math.random() * (totalSamples - 800));
      const freq = 900 + Math.random() * 1400;
      for (let j = 0; j < 650; j += 1) {
        const dt = j / SAMPLE_RATE;
        raw[pos + j] += Math.sin(2 * Math.PI * freq * dt) * Math.exp(-dt * 95) * 0.06;
      }
    }
  }

  const fadeSamples = Math.floor(SAMPLE_RATE * 0.25);
  const out = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i += 1) {
    out[i] = raw[i];
  }
  for (let i = 0; i < fadeSamples; i += 1) {
    const alpha = i / fadeSamples;
    const tailIdx = totalSamples - fadeSamples + i;
    out[i] = raw[i] * alpha + raw[tailIdx] * (1 - alpha);
  }

  weatherUriCache[weather] = encodeWavDataUri(out, SAMPLE_RATE);
  return weatherUriCache[weather];
}

function getBarkHowlUri() {
  if (barkHowlUriCache) return barkHowlUriCache;

  const duration = 4.4;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const dry = new Float32Array(totalSamples);

  const barkOffsets = [
    { startSec: 0.0, durSec: 0.14, fStart: 340, fEnd: 155 },
    { startSec: 0.18, durSec: 0.15, fStart: 300, fEnd: 145 },
  ];

  for (const b of barkOffsets) {
    const startIdx = Math.floor(b.startSec * SAMPLE_RATE);
    const len = Math.floor(b.durSec * SAMPLE_RATE);
    let phase = 0;
    for (let j = 0; j < len; j += 1) {
      const t = j / SAMPLE_RATE;
      const ratio = j / len;
      const freq = b.fStart * Math.pow(b.fEnd / b.fStart, ratio);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.018);
      const decay = Math.exp(-t * 14);
      const env = attack * decay;
      const wave =
        0.58 * Math.sin(phase) +
        0.28 * Math.sin(phase * 2) +
        0.14 * Math.sin(phase * 3);
      dry[startIdx + j] += wave * env * 0.26;
    }
  }

  const howlStart = Math.floor(2.35 * SAMPLE_RATE);
  const howlLen = Math.floor(1.8 * SAMPLE_RATE);
  let howlPhase = 0;
  for (let j = 0; j < howlLen; j += 1) {
    const t = j / SAMPLE_RATE;
    let freq;
    if (t < 0.5) {
      freq = 245 * Math.pow(420 / 245, t / 0.5);
    } else {
      freq = 420 * Math.pow(275 / 420, (t - 0.5) / 1.3);
    }
    const vibrato = 1 + 0.014 * Math.sin(2 * Math.PI * 5.5 * t);
    howlPhase += (2 * Math.PI * freq * vibrato) / SAMPLE_RATE;

    const attack = Math.min(1, t / 0.28);
    const release = t > 1.2 ? Math.max(0, 1 - (t - 1.2) / 0.6) : 1;
    const env = attack * release;
    const tone =
      0.66 * Math.sin(howlPhase) +
      0.22 * Math.sin(howlPhase * 2) +
      0.08 * Math.sin(howlPhase * 3);
    dry[howlStart + j] += tone * env * 0.25;
  }

  const out = new Float32Array(totalSamples);
  const d1 = Math.floor(0.22 * SAMPLE_RATE);
  const d2 = Math.floor(0.45 * SAMPLE_RATE);
  let lp = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const wet =
      dry[i] +
      (i >= d1 ? dry[i - d1] * 0.34 : 0) +
      (i >= d2 ? dry[i - d2] * 0.17 : 0);
    lp = 0.72 * lp + 0.28 * wet;
    out[i] = lp;
  }

  barkHowlUriCache = encodeWavDataUri(out, SAMPLE_RATE);
  return barkHowlUriCache;
}

function getOwlHootUri() {
  if (owlUriCache) return owlUriCache;

  const duration = 2.4;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const dry = new Float32Array(totalSamples);

  // Soft far-away "hoo... hoo-hooo..." cadence
  const hoots = [
    { startSec: 0.04, durSec: 0.38, fStart: 395, fEnd: 365 },
    { startSec: 0.68, durSec: 0.22, fStart: 390, fEnd: 375 },
    { startSec: 1.02, durSec: 0.56, fStart: 392, fEnd: 342 },
  ];

  for (const h of hoots) {
    const startIdx = Math.floor(h.startSec * SAMPLE_RATE);
    const len = Math.floor(h.durSec * SAMPLE_RATE);
    let phase = 0;
    for (let j = 0; j < len; j += 1) {
      const t = j / SAMPLE_RATE;
      const ratio = j / len;
      const freq = h.fStart + (h.fEnd - h.fStart) * ratio + Math.sin(2 * Math.PI * 4.5 * t) * 3;
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;

      const attack = Math.min(1, t / 0.06);
      const release = Math.min(1, (h.durSec - t) / 0.12);
      const env = attack * Math.max(0, release);
      const wave = 0.85 * Math.sin(phase) + 0.12 * Math.sin(phase * 2);
      dry[startIdx + j] += wave * env * 0.24;
    }
  }

  const out = new Float32Array(totalSamples);
  const d1 = Math.floor(0.24 * SAMPLE_RATE);
  const d2 = Math.floor(0.48 * SAMPLE_RATE);
  let lp = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const wet =
      dry[i] +
      (i >= d1 ? dry[i - d1] * 0.32 : 0) +
      (i >= d2 ? dry[i - d2] * 0.15 : 0);
    lp = 0.76 * lp + 0.24 * wet;
    out[i] = lp;
  }

  owlUriCache = encodeWavDataUri(out, SAMPLE_RATE);
  return owlUriCache;
}

function getThunderUri() {
  if (thunderUriCache) return thunderUriCache;

  const duration = 2.7;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / SAMPLE_RATE;
    const white = Math.random() * 2 - 1;
    lp1 = 0.988 * lp1 + white * 0.045;
    lp2 = 0.975 * lp2 + lp1 * 0.14;
    const crack = t < 0.32 ? white * Math.exp(-t * 14) * 0.16 : 0;
    const attack = Math.min(1, t / 0.09);
    const env = attack * Math.exp(-t * 1.25);
    out[i] = (lp2 * 1.45 + crack) * env;
  }

  let maxAbs = 0.001;
  for (let i = 0; i < totalSamples; i += 1) {
    const a = Math.abs(out[i]);
    if (a > maxAbs) maxAbs = a;
  }
  const scale = 0.55 / maxAbs;
  for (let i = 0; i < totalSamples; i += 1) {
    out[i] *= scale;
  }

  thunderUriCache = encodeWavDataUri(out, SAMPLE_RATE);
  return thunderUriCache;
}

function primeOneShotEl(el, uri, getGen) {
  if (!el || el._primed || !el.paused) return;
  el._primed = true;
  if (!el.src) el.src = uri;
  const gen = getGen();
  el.muted = true;
  el.play()
    .then(() => {
      if (getGen() === gen) {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          // ignore
        }
        el.muted = false;
      }
    })
    .catch(() => {
      el._primed = false;
      el.muted = false;
    });
}

function pauseAllAudio() {
  stopNatureCallLoop();
  [musicEl, weatherEl, barkEl, owlEl, thunderEl].forEach((el) => {
    if (el && !el.paused) {
      try {
        el.pause();
      } catch {
        // ignore
      }
    }
  });
}

function shouldPlayWeatherAudio() {
  return (
    isSoundEnabled &&
    isWeatherSoundEnabled &&
    isAppActive() &&
    currentRoom !== 'ash-room' &&
    (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'windy')
  );
}

function stopNatureCallLoop() {
  if (natureCallTimer) {
    clearTimeout(natureCallTimer);
    natureCallTimer = null;
  }
}

function scheduleNextNatureCall(delayMs) {
  stopNatureCallLoop();
  if (!isSoundEnabled || !isAppActive()) return;
  natureCallTimer = setTimeout(() => {
    natureCallTimer = null;
    if (!isSoundEnabled || !isAppActive()) return;
    if (nextNatureCallIsOwl) {
      nextNatureCallIsOwl = false;
      playOwlHoot(false);
    } else {
      nextNatureCallIsOwl = true;
      playDogBarkAndHowl(false);
    }
  }, delayMs);
}

function startNatureCallLoopIfIdle() {
  if (!isSoundEnabled || !isAppActive()) return;
  if (natureCallTimer) return;
  const initialPause = 1800 + Math.floor(Math.random() * 2200);
  scheduleNextNatureCall(initialPause);
}

function syncActiveAudio(fromGesture = false) {
  ensureElements();
  if (!isSoundEnabled || !isAppActive()) {
    pauseAllAudio();
    return;
  }

  setPlaybackAudioSession();

  const targetMusic = savedMusicUrl || getHarpLoopUri();
  if (musicEl) {
    if (currentMusicSrc !== targetMusic) {
      currentMusicSrc = targetMusic;
      musicEl.src = targetMusic;
    }
    musicEl.muted = false;
    if (musicEl.paused) {
      musicEl
        .play()
        .then(() => {
          audioUnlocked = true;
          if (fromGesture) unlockedAtMs = Date.now();
        })
        .catch(() => {
          const fallbackUri = getHarpLoopUri();
          if (savedMusicUrl && currentMusicSrc !== fallbackUri) {
            currentMusicSrc = fallbackUri;
            musicEl.src = fallbackUri;
            musicEl
              .play()
              .then(() => {
                audioUnlocked = true;
                if (fromGesture) unlockedAtMs = Date.now();
              })
              .catch(() => {});
          }
        });
    } else {
      audioUnlocked = true;
    }
  }

  if (weatherEl) {
    if (shouldPlayWeatherAudio()) {
      const targetWeather = getWeatherUri(currentWeather);
      if (currentWeatherSrc !== targetWeather) {
        currentWeatherSrc = targetWeather;
        weatherEl.src = targetWeather;
      }
      weatherEl.muted = false;
      if (weatherEl.paused) {
        weatherEl.play().catch(() => {});
      }
    } else if (!weatherEl.paused) {
      try {
        weatherEl.pause();
      } catch {
        // ignore
      }
    }
  }

  startNatureCallLoopIfIdle();
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

export function wasRecentlyUnlockedInGesture(windowMs = 600) {
  return unlockedAtMs > 0 && Date.now() - unlockedAtMs < windowMs;
}

export function unlockAudioFromGesture() {
  if (typeof window === 'undefined') return;
  isAppForeground = typeof document === 'undefined' ? true : !document.hidden;
  setPlaybackAudioSession();
  ensureElements();

  if (isSoundEnabled && isAppActive()) {
    unlockedAtMs = Date.now();
    syncActiveAudio(true);
    primeOneShotEl(barkEl, getBarkHowlUri(), () => barkPlayGen);
    primeOneShotEl(owlEl, getOwlHootUri(), () => owlPlayGen);
    primeOneShotEl(thunderEl, getThunderUri(), () => thunderPlayGen);
  }
}

function setAppForeground(active) {
  isAppForeground = Boolean(active);
  syncActiveAudio(false);
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

  const handleGestureUnlock = () => {
    isAppForeground = !document.hidden;
    if (isSoundEnabled && isAppActive()) {
      const needsMusic = !musicEl || musicEl.paused;
      const needsWeather = shouldPlayWeatherAudio() && (!weatherEl || weatherEl.paused);
      if (!audioUnlocked || needsMusic || needsWeather) {
        unlockAudioFromGesture();
      }
    }
  };

  window.addEventListener('touchend', handleGestureUnlock, { capture: true, passive: true });
  window.addEventListener('mouseup', handleGestureUnlock, { capture: true, passive: true });
  window.addEventListener('click', handleGestureUnlock, { capture: true, passive: true });
  window.addEventListener('keydown', handleGestureUnlock, { capture: true, passive: true });
}

export function setSoundState({
  enabled,
  weatherSoundEnabled = true,
  musicUrl = '',
  weather = 'clear',
  room = 'tombstone',
}) {
  isSoundEnabled = Boolean(enabled);
  isWeatherSoundEnabled = Boolean(weatherSoundEnabled);
  savedMusicUrl = (musicUrl || '').trim();
  currentWeather = weather;
  currentRoom = room;
  syncActiveAudio(false);
}

export function playThunderSound() {
  if (!isSoundEnabled || !isWeatherSoundEnabled || !isAppActive() || currentRoom === 'ash-room') {
    return;
  }
  ensureElements();
  if (!thunderEl) return;

  setPlaybackAudioSession();
  thunderPlayGen += 1;
  thunderEl._primed = true;
  thunderEl.muted = false;
  const uri = getThunderUri();
  if (thunderEl.src !== uri) {
    thunderEl.src = uri;
  }
  try {
    thunderEl.currentTime = 0;
  } catch {
    // ignore
  }
  thunderEl.play().catch(() => {});
}

export function playDogBarkAndHowl(force = false) {
  if (!isSoundEnabled || !isAppActive()) return;
  const nowMs = Date.now();
  if (!force && nowMs < nextBarkAllowedAt) return;
  nextBarkAllowedAt = nowMs + 4500;

  ensureElements();
  if (!barkEl) return;

  // Never mix owl & bark/howl at the same time
  if (owlEl && !owlEl.paused) {
    try {
      owlEl.pause();
    } catch {
      // ignore
    }
  }

  setPlaybackAudioSession();
  barkPlayGen += 1;
  barkEl._primed = true;
  barkEl.muted = false;
  const uri = getBarkHowlUri();
  if (barkEl.src !== uri) {
    barkEl.src = uri;
  }
  try {
    barkEl.currentTime = 0;
  } catch {
    // ignore
  }
  barkEl.play().catch(() => {});

  nextNatureCallIsOwl = true;
  // 4.4s clip + 2-5s silent pause before Owl Hoot
  scheduleNextNatureCall(4400 + 2000 + Math.floor(Math.random() * 3000));
}

export function playOwlHoot(force = false) {
  if (!isSoundEnabled || !isAppActive()) return;
  const nowMs = Date.now();
  if (!force && nowMs < nextOwlAllowedAt) return;
  nextOwlAllowedAt = nowMs + 3000;

  ensureElements();
  if (!owlEl) return;

  // Never mix owl & bark/howl at the same time
  if (barkEl && !barkEl.paused) {
    try {
      barkEl.pause();
    } catch {
      // ignore
    }
  }

  setPlaybackAudioSession();
  owlPlayGen += 1;
  owlEl._primed = true;
  owlEl.muted = false;
  const uri = getOwlHootUri();
  if (owlEl.src !== uri) {
    owlEl.src = uri;
  }
  try {
    owlEl.currentTime = 0;
  } catch {
    // ignore
  }
  owlEl.play().catch(() => {});

  nextNatureCallIsOwl = false;
  // 2.4s clip + 2-5s silent pause before Dog Bark/Howl
  scheduleNextNatureCall(2400 + 2000 + Math.floor(Math.random() * 3000));
}
