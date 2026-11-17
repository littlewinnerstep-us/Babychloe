// HTML5 <audio> PCM WAV synthesizer & playback engine for Safari (iOS/macOS), Android WebView & Desktop.
// Uses synthesized 16-bit PCM WAV data URIs inside <audio playsinline> media elements so iPhone Safari
// plays cleanly through AVAudioSession "playback" even when the physical Silent/Ring switch is ON.
// Strictly plays only while the app is active in the foreground.

const SAMPLE_RATE = 16000;

let harpUriCache = null;
const weatherUriCache = {};
let barkHowlUriCache = null;
let thunderUriCache = null;

let musicEl = null;
let weatherEl = null;
let barkEl = null;
let thunderEl = null;

let currentMusicSrc = '';
let currentWeatherSrc = '';
let savedMusicUrl = '';

let isSoundEnabled = true;
let currentWeather = 'clear';
let isAppForeground = typeof document === 'undefined' ? true : !document.hidden;

let audioUnlocked = false;
let unlockedAtMs = 0;
let barkPlayGen = 0;
let thunderPlayGen = 0;
let nextBarkAllowedAt = 0;

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
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
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

  // Seamless 0.28s wrap-around echo
  const out = new Float32Array(totalSamples);
  const delaySamples = Math.floor(SAMPLE_RATE * 0.28);
  const delaySamples2 = Math.floor(SAMPLE_RATE * 0.56);
  for (let i = 0; i < totalSamples; i += 1) {
    const d1 = dry[(i - delaySamples + totalSamples) % totalSamples];
    const d2 = dry[(i - delaySamples2 + totalSamples) % totalSamples];
    out[i] = dry[i] + d1 * 0.32 + d2 * 0.14;
  }

  // Normalize gently to peak ~0.35
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

  // Pink-ish noise + optional storm rumble or water droplets
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
      // 'rain'
      raw[i] = pink * 0.22 + white * 0.038;
    }
  }

  // Soft rain droplet plinks
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

  // Crossfade first/last 0.25s so 4s loop is click-free
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

  // Two soft far-away barks ("arf-woof") at 0.00s and 0.18s
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

  // 2-second pause (with only soft initial bark echo), then distant howl from 2.35s - 4.15s
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

  // Distant 2-tap valley echo + single-pole lowpass warmth (~850Hz feel)
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
  [musicEl, weatherEl, barkEl, thunderEl].forEach((el) => {
    if (el && !el.paused) {
      try {
        el.pause();
      } catch {
        // ignore
      }
    }
  });
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
          // If custom external URL fails to load/play, fall back to built-in harp
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
    if (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'windy') {
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

  // WebKit only unlocks HTMLMediaElement on touchend, mouseup, click, keydown (never touchstart)
  const handleGestureUnlock = () => {
    isAppForeground = !document.hidden;
    if (isSoundEnabled && isAppActive()) {
      const needsMusic = !musicEl || musicEl.paused;
      const needsWeather =
        (currentWeather === 'rain' || currentWeather === 'thunderstorm' || currentWeather === 'windy') &&
        (!weatherEl || weatherEl.paused);
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

export function setSoundState({ enabled, musicUrl = '', weather = 'clear' }) {
  isSoundEnabled = Boolean(enabled);
  savedMusicUrl = (musicUrl || '').trim();
  currentWeather = weather;
  syncActiveAudio(false);
}

export function playThunderSound() {
  if (!isSoundEnabled || !isAppActive()) return;
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
}
