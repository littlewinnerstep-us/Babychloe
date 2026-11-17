const DAILY_LIMITS_KEY = 'evergreen_paws_daily_limits_v1';

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function buildKey(userEmail, memorialId, category) {
  const email = (userEmail || 'guest').trim().toLowerCase();
  return `${getTodayDateString()}::${email}::${memorialId}::${category}`;
}

function loadLimitsMap() {
  try {
    const raw = localStorage.getItem(DAILY_LIMITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export function hasGivenToday(userEmail, memorialId, category) {
  if (!userEmail || !memorialId || !category) return false;
  const map = loadLimitsMap();
  return Boolean(map[buildKey(userEmail, memorialId, category)]);
}

export function recordGivenToday(userEmail, memorialId, category) {
  if (!userEmail || !memorialId || !category) return;
  const map = loadLimitsMap();
  const today = getTodayDateString();
  // Prune older days to keep storage tidy
  const cleaned = {};
  Object.keys(map).forEach((k) => {
    if (k.startsWith(today)) cleaned[k] = map[k];
  });
  cleaned[buildKey(userEmail, memorialId, category)] = true;
  try {
    localStorage.setItem(DAILY_LIMITS_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore storage errors
  }
}

export function getDailyLimitNotice(category, petName) {
  const labelMap = {
    flower: { emoji: '🌸', name: 'flower' },
    candle: { emoji: '🕯️', name: 'candle' },
    incense: { emoji: '🪔', name: 'incense' },
    treat: { emoji: '🦴', name: 'treat/gift' },
    message: { emoji: '💌', name: 'message' },
  };
  const info = labelMap[category] || { emoji: '✨', name: 'gift' };
  return `${info.emoji} You already gave a ${info.name} to ${petName} today (Max 1 per day).`;
}
