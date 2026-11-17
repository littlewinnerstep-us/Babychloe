// HTML5 <audio> PCM WAV synthesizer & playback engine for Safari (iOS/macOS), Android WebView & Desktop.
// Uses synthesized 16-bit PCM WAV data URIs inside <audio playsinline> media elements so iPhone Safari
// plays cleanly through AVAudioSession "playback" even when the physical Silent/Ring switch is ON.
// Strictly plays only while the app is active in the foreground.

const SAMPLE_RATE = 16000;

let harpUriCache = null;
const weatherUriCache = {};
let barkHowlUriCache = null;
let owlUriCache = null;
let birdUriCache = null;
let thunderUriCache = null;

let musicEl = null;
let weatherEls = [null, null];
let activeWeatherSlot = 0;
let weatherFadeTimer = null;
let barkEl = null;
let owlEl = null;
let birdEl = null;
let thunderEls = [null, null];
let thunderSlot = 0;

let currentMusicSrc = '';
let currentWeatherSrc = '';
let savedMusicUrl = '';

let isSoundEnabled = true;
let isWeatherSoundEnabled = true;
let currentWeather = 'clear';
let currentRoom = 'tombstone';
let currentAtmosphere = 'dusk';
let isAppForeground = typeof document === 'undefined' ? true : !document.hidden;

export const DEFAULT_SOUND_VOLUMES = {
  master: 1.0,
  music: 0.65,
  weather: 0.45,
  thunder: 0.7,
  bark: 0.55,
  owl: 0.5,
  bird: 0.55,
};

let soundVolumes = { ...DEFAULT_SOUND_VOLUMES };

function clampVol(v) {
  const num = Number(v);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function getEffectiveVol(key) {
  return clampVol(soundVolumes.master * (soundVolumes[key] ?? 1));
}

function applyElementVolume(el, key, multiplier = 1) {
  if (!el) return;
  const eff = clampVol(soundVolumes.master * (soundVolumes[key] ?? 1) * multiplier);
  try {
    el.volume = eff;
  } catch {
    // Some browsers make HTMLAudioElement.volume read-only
  }
  el.muted = eff <= 0.001;
}

function applyAllVolumes() {
  applyElementVolume(musicEl, 'music');
  weatherEls.forEach((wEl, idx) => {
    if (wEl && !weatherFadeTimer) {
      applyElementVolume(wEl, 'weather', idx === activeWeatherSlot ? 1 : 0);
    }
  });
  applyElementVolume(barkEl, 'bark');
  applyElementVolume(owlEl, 'owl');
  applyElementVolume(birdEl, 'bird');
  thunderEls.forEach((tEl) => applyElementVolume(tEl, 'thunder'));
}

let audioUnlocked = false;
let unlockedAtMs = 0;
let barkPlayGen = 0;
let owlPlayGen = 0;
let birdPlayGen = 0;
let thunderPlayGen = 0;
let nextBarkAllowedAt = 0;
let nextOwlAllowedAt = 0;
let nextBirdAllowedAt = 0;
let natureCallTimer = null;
let nextNatureCallIsOwl = false;
let prewarmStarted = false;

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

function createMediaEl(loop, volumeKey) {
  const el = new Audio();
  el.loop = loop;
  el.playsInline = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  applyElementVolume(el, volumeKey);
  return el;
}

function ensureElements() {
  if (typeof window === 'undefined') return;
  if (!musicEl) musicEl = createMediaEl(true, 'music');
  if (!weatherEls[0]) weatherEls[0] = createMediaEl(true, 'weather');
  if (!weatherEls[1]) weatherEls[1] = createMediaEl(true, 'weather');
  if (!barkEl) barkEl = createMediaEl(false, 'bark');
  if (!owlEl) owlEl = createMediaEl(false, 'owl');
  if (!birdEl) birdEl = createMediaEl(false, 'bird');
  if (!thunderEls[0]) thunderEls[0] = createMediaEl(false, 'thunder');
  if (!thunderEls[1]) thunderEls[1] = createMediaEl(false, 'thunder');
  applyAllVolumes();
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

function getMorningBirdUri() {
  if (birdUriCache) return birdUriCache;

  const duration = 3.2;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const dry = new Float32Array(totalSamples);

  // Gentle morning songbird chirps & cheerful soft garden trills
  const chirps = [
    { startSec: 0.08, durSec: 0.14, f0: 2150, f1: 2780, sweep: 1 },
    { startSec: 0.27, durSec: 0.13, f0: 2450, f1: 3050, sweep: 1 },
    { startSec: 0.48, durSec: 0.22, f0: 2820, f1: 2320, sweep: -1 },
    { startSec: 1.18, durSec: 0.12, f0: 1980, f1: 2560, sweep: 1 },
    { startSec: 1.36, durSec: 0.18, f0: 2380, f1: 2940, sweep: 1 },
    { startSec: 1.62, durSec: 0.26, f0: 2760, f1: 2240, sweep: -1 },
    { startSec: 2.38, durSec: 0.14, f0: 2260, f1: 2860, sweep: 1 },
    { startSec: 2.58, durSec: 0.20, f0: 2680, f1: 3120, sweep: 1 },
  ];

  for (const c of chirps) {
    const startIdx = Math.floor(c.startSec * SAMPLE_RATE);
    const len = Math.floor(c.durSec * SAMPLE_RATE);
    let phase = 0;
    for (let j = 0; j < len; j += 1) {
      const t = j / SAMPLE_RATE;
      const ratio = j / len;
      const vibrato = Math.sin(2 * Math.PI * 26 * t) * 42;
      const freq = c.f0 + (c.f1 - c.f0) * Math.sin(ratio * Math.PI * 0.65) + vibrato;
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;

      const attack = Math.min(1, t / 0.025);
      const release = Math.min(1, (c.durSec - t) / 0.055);
      const env = attack * Math.max(0, release);
      const wave = 0.78 * Math.sin(phase) + 0.18 * Math.sin(phase * 2);
      dry[startIdx + j] += wave * env * 0.2;
    }
  }

  const out = new Float32Array(totalSamples);
  const d1 = Math.floor(0.18 * SAMPLE_RATE);
  const d2 = Math.floor(0.36 * SAMPLE_RATE);
  let lp = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const wet =
      dry[i] +
      (i >= d1 ? dry[i - d1] * 0.28 : 0) +
      (i >= d2 ? dry[i - d2] * 0.14 : 0);
    lp = 0.74 * lp + 0.26 * wet;
    out[i] = lp;
  }

  birdUriCache = encodeWavDataUri(out, SAMPLE_RATE);
  return birdUriCache;
}

function prewarmAudioUris() {
  if (prewarmStarted || typeof window === 'undefined') return;
  prewarmStarted = true;
  const tasks = [
    () => getHarpLoopUri(),
    () => getWeatherUri('rain'),
    () => getWeatherUri('windy'),
    () => getWeatherUri('thunderstorm'),
    () => getMorningBirdUri(),
    () => getBarkHowlUri(),
    () => getOwlHootUri(),
    () => getThunderUri(),
  ];
  tasks.forEach((fn, i) => {
    setTimeout(() => {
      try {
        fn();
      } catch {
        // ignore
      }
    }, i * 45);
  });
}

function primeOneShotEl(el, uri, getGen, volKey) {
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
        applyElementVolume(el, volKey);
      }
    })
    .catch(() => {
      el._primed = false;
      applyElementVolume(el, volKey);
    });
}

function safePause(el) {
  if (el && !el.paused) {
    try {
      el.pause();
    } catch {
      // ignore
    }
  }
}

function stopWeatherFade() {
  if (weatherFadeTimer) {
    clearInterval(weatherFadeTimer);
    weatherFadeTimer = null;
  }
}

function pauseAllAudio() {
  stopNatureCallLoop();
  stopWeatherFade();
  [musicEl, weatherEls[0], weatherEls[1], barkEl, owlEl, birdEl, thunderEls[0], thunderEls[1]].forEach(safePause);
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
    if (currentAtmosphere === 'morning') {
      playMorningBird(false);
    } else if (nextNatureCallIsOwl) {
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
  const initialPause = 1500 + Math.floor(Math.random() * 2000);
  scheduleNextNatureCall(initialPause);
}

function syncWeatherCrossfade() {
  const shouldPlay = shouldPlayWeatherAudio() && getEffectiveVol('weather') > 0.001;
  const curEl = weatherEls[activeWeatherSlot];
  const altSlot = activeWeatherSlot === 0 ? 1 : 0;
  const nextEl = weatherEls[altSlot];

  if (!shouldPlay) {
    stopWeatherFade();
    currentWeatherSrc = '';
    safePause(curEl);
    safePause(nextEl);
    return;
  }

  const targetWeather = getWeatherUri(currentWeather);
  // If already playing this exact weather smoothly, just ensure volume & playing without restarting
  if (currentWeatherSrc === targetWeather && curEl && !curEl.paused && !weatherFadeTimer) {
    applyElementVolume(curEl, 'weather', 1);
    return;
  }

  // Smooth crossfade from curEl -> nextEl with zero lag or interruption
  currentWeatherSrc = targetWeather;
  if (!nextEl) return;

  if (curEl && curEl.paused) {
    // Nothing playing yet: start curEl cleanly
    if (curEl.src !== targetWeather) curEl.src = targetWeather;
    applyElementVolume(curEl, 'weather', 1);
    curEl.play().catch(() => {});
    return;
  }

  stopWeatherFade();
  if (nextEl.src !== targetWeather) nextEl.src = targetWeather;
  applyElementVolume(nextEl, 'weather', 0.02);
  nextEl.play().catch(() => {});

  const oldEl = curEl;
  const newSlot = altSlot;
  let step = 0;
  const totalSteps = 8;
  weatherFadeTimer = setInterval(() => {
    step += 1;
    const progress = Math.min(1, step / totalSteps);
    applyElementVolume(nextEl, 'weather', progress);
    applyElementVolume(oldEl, 'weather', 1 - progress);
    if (step >= totalSteps) {
      stopWeatherFade();
      safePause(oldEl);
      activeWeatherSlot = newSlot;
      applyElementVolume(nextEl, 'weather', 1);
    }
  }, 40);
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
    applyElementVolume(musicEl, 'music');
    if (getEffectiveVol('music') <= 0.001) {
      safePause(musicEl);
    } else if (musicEl.paused) {
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

  syncWeatherCrossfade();

  // Enforce morning vs dusk/night nature separation immediately
  if (currentAtmosphere === 'morning') {
    safePause(barkEl);
    safePause(owlEl);
  } else {
    safePause(birdEl);
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
  prewarmAudioUris();

  if (isSoundEnabled && isAppActive()) {
    unlockedAtMs = Date.now();
    syncActiveAudio(true);
    primeOneShotEl(barkEl, getBarkHowlUri(), () => barkPlayGen, 'bark');
    primeOneShotEl(owlEl, getOwlHootUri(), () => owlPlayGen, 'owl');
    primeOneShotEl(birdEl, getMorningBirdUri(), () => birdPlayGen, 'bird');
    primeOneShotEl(thunderEls[0], getThunderUri(), () => thunderPlayGen, 'thunder');
    primeOneShotEl(thunderEls[1], getThunderUri(), () => thunderPlayGen, 'thunder');
  }
}

export function getSoundVolumes() {
  return { ...soundVolumes };
}

export function setSoundVolumes(patch) {
  if (!patch || typeof patch !== 'object') return getSoundVolumes();
  const next = { ...soundVolumes };
  Object.keys(DEFAULT_SOUND_VOLUMES).forEach((key) => {
    if (patch[key] !== undefined) {
      next[key] = clampVol(patch[key]);
    }
  });
  soundVolumes = next;
  applyAllVolumes();
  if (isSoundEnabled && isAppActive()) {
    syncActiveAudio(false);
  }
  return getSoundVolumes();
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
      const curW = weatherEls[activeWeatherSlot];
      const needsMusic = getEffectiveVol('music') > 0.001 && (!musicEl || musicEl.paused);
      const needsWeather = shouldPlayWeatherAudio() && getEffectiveVol('weather') > 0.001 && (!curW || curW.paused);
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
  atmosphere = 'dusk',
  volumes,
}) {
  const prevAtm = currentAtmosphere;
  isSoundEnabled = Boolean(enabled);
  isWeatherSoundEnabled = Boolean(weatherSoundEnabled);
  savedMusicUrl = (musicUrl || '').trim();
  currentWeather = weather;
  currentRoom = room;
  currentAtmosphere = atmosphere || 'dusk';
  if (volumes && typeof volumes === 'object') {
    const next = { ...soundVolumes };
    Object.keys(DEFAULT_SOUND_VOLUMES).forEach((key) => {
      if (volumes[key] !== undefined) next[key] = clampVol(volumes[key]);
    });
    soundVolumes = next;
  }
  applyAllVolumes();
  if (prevAtm !== currentAtmosphere) {
    stopNatureCallLoop();
  }
  syncActiveAudio(false);
}

export function playThunderSound() {
  if (
    !isSoundEnabled ||
    !isWeatherSoundEnabled ||
    !isAppActive() ||
    currentRoom === 'ash-room' ||
    getEffectiveVol('thunder') <= 0.001
  ) {
    return;
  }
  ensureElements();
  thunderSlot = thunderSlot === 0 ? 1 : 0;
  const tEl = thunderEls[thunderSlot];
  if (!tEl) return;

  setPlaybackAudioSession();
  thunderPlayGen += 1;
  tEl._primed = true;
  applyElementVolume(tEl, 'thunder');
  const uri = getThunderUri();
  if (tEl.src !== uri) {
    tEl.src = uri;
  }
  try {
    tEl.currentTime = 0;
  } catch {
    // ignore
  }
  tEl.play().catch(() => {});
}

export function playMorningBird(force = false) {
  if (!isSoundEnabled || !isAppActive()) return;
  if (!force && currentAtmosphere !== 'morning') return;
  if (getEffectiveVol('bird') <= 0.001) {
    if (!force && currentAtmosphere === 'morning') {
      scheduleNextNatureCall(3200 + Math.floor(Math.random() * 2800));
    }
    return;
  }
  const nowMs = Date.now();
  if (!force && nowMs < nextBirdAllowedAt) return;
  nextBirdAllowedAt = nowMs + 3200;

  ensureElements();
  if (!birdEl) return;

  safePause(barkEl);
  safePause(owlEl);

  setPlaybackAudioSession();
  birdPlayGen += 1;
  birdEl._primed = true;
  applyElementVolume(birdEl, 'bird');
  const uri = getMorningBirdUri();
  if (birdEl.src !== uri) {
    birdEl.src = uri;
  }
  try {
    birdEl.currentTime = 0;
  } catch {
    // ignore
  }
  birdEl.play().catch(() => {});

  if (currentAtmosphere === 'morning') {
    // 3.2s bird song + gentle 2.5-5.5s calm morning interval
    scheduleNextNatureCall(3200 + 2500 + Math.floor(Math.random() * 3000));
  }
}

export function playDogBarkAndHowl(force = false) {
  if (!isSoundEnabled || !isAppActive()) return;
  // Bark & howl sound must NOT come out in morning — play gentle morning bird instead
  if (currentAtmosphere === 'morning') {
    safePause(barkEl);
    safePause(owlEl);
    playMorningBird(force);
    return;
  }
  if (getEffectiveVol('bark') <= 0.001) {
    if (force) return;
    nextNatureCallIsOwl = true;
    scheduleNextNatureCall(3000 + Math.floor(Math.random() * 2500));
    return;
  }
  const nowMs = Date.now();
  if (!force && nowMs < nextBarkAllowedAt) return;
  nextBarkAllowedAt = nowMs + 4500;

  ensureElements();
  if (!barkEl) return;

  // Never mix owl & bark/howl at the same time
  safePause(owlEl);
  safePause(birdEl);

  setPlaybackAudioSession();
  barkPlayGen += 1;
  barkEl._primed = true;
  applyElementVolume(barkEl, 'bark');
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
  // Owl sound must NOT come out in morning — play gentle morning bird instead
  if (currentAtmosphere === 'morning') {
    safePause(barkEl);
    safePause(owlEl);
    playMorningBird(force);
    return;
  }
  if (getEffectiveVol('owl') <= 0.001) {
    if (force) return;
    nextNatureCallIsOwl = false;
    scheduleNextNatureCall(3000 + Math.floor(Math.random() * 2500));
    return;
  }
  const nowMs = Date.now();
  if (!force && nowMs < nextOwlAllowedAt) return;
  nextOwlAllowedAt = nowMs + 3000;

  ensureElements();
  if (!owlEl) return;

  // Never mix owl & bark/howl at the same time
  safePause(barkEl);
  safePause(birdEl);

  setPlaybackAudioSession();
  owlPlayGen += 1;
  owlEl._primed = true;
  applyElementVolume(owlEl, 'owl');
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
