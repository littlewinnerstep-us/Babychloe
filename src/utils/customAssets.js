/**
 * Custom asset schema, validation, hex color normalization, animated effect math,
 * style/offering token resolution, image cache, and customer flower/color hold prefs.
 */

export const ASSET_KINDS = ['plot-style', 'niche-style', 'flower', 'toy'];

export const ASSET_EFFECTS = [
  { id: 'lively', label: 'Lively', icon: '✨' },
  { id: 'pulse', label: 'Pulse', icon: '💓' },
  { id: 'breathing', label: 'Breathing', icon: '🌬️' },
  { id: 'sparkle', label: 'Sparkle', icon: '🌟' },
  { id: 'shimmer', label: 'Shimmer', icon: '🪩' },
  { id: 'flicker', label: 'Flicker', icon: '🕯️' },
  { id: 'float', label: 'Float', icon: '🪶' },
];

export const ALLOWED_EFFECT_IDS = new Set(ASSET_EFFECTS.map((e) => e.id));

export const CUSTOMER_FLOWER_PRESETS = [
  { emoji: '🌸', label: 'Cherry Blossom' },
  { emoji: '🌹', label: 'Rose' },
  { emoji: '🌻', label: 'Sunflower' },
  { emoji: '🪷', label: 'Lotus' },
  { emoji: '🌼', label: 'Daisy' },
  { emoji: '🌷', label: 'Tulip' },
  { emoji: '💐', label: 'Bouquet' },
  { emoji: '🌺', label: 'Hibiscus' },
];

const CUSTOMER_HOLD_STORAGE_KEY = 'evergreen_paws_customer_hold_v1';
const MAX_DATA_IMAGE_LENGTH = 36000;
const MAX_URL_LENGTH = 1024;

/**
 * Normalize a hex color string to #rrggbb or return fallback.
 */
export function normalizeHex(input, fallback = '#f5d076') {
  const raw = String(input || '').trim();
  const match3 = raw.match(/^#?([0-9a-fA-F]{3})$/);
  if (match3) {
    const [r, g, b] = match3[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const match6 = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (match6) {
    return `#${match6[1].toLowerCase()}`;
  }
  return fallback;
}

/**
 * Validate external image link or compressed data URI for safety and MQTT budget.
 */
export function isSafeImageUrl(url) {
  if (!url) return true;
  const s = String(url).trim();
  if (!s) return true;
  if (s.startsWith('data:image/')) {
    return s.length <= MAX_DATA_IMAGE_LENGTH && !s.startsWith('data:image/svg+xml');
  }
  if (s.startsWith('https://')) {
    return s.length <= MAX_URL_LENGTH && !/\s/.test(s);
  }
  return false;
}

export function normalizeEffects(effects) {
  if (!Array.isArray(effects)) return [];
  const out = [];
  for (const item of effects) {
    const id = String(item || '').trim().toLowerCase();
    if (ALLOWED_EFFECT_IDS.has(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out;
}

export function sanitizeAsset(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim().slice(0, 64);
  if (!id) return null;
  const kind = ASSET_KINDS.includes(raw.kind) ? raw.kind : 'flower';
  const name = String(raw.name || 'Custom Asset').trim().slice(0, 40) || 'Custom Asset';
  const emoji = String(raw.emoji || (kind === 'flower' ? '🌸' : kind === 'toy' ? '🧸' : '🪨')).trim().slice(0, 8);
  const imageUrl = isSafeImageUrl(raw.imageUrl) ? String(raw.imageUrl || '').trim() : '';
  const primaryColor = normalizeHex(raw.primaryColor, kind === 'niche-style' ? '#e5c882' : '#d8dfcf');
  const accentColor = normalizeHex(raw.accentColor, '#f5d076');
  const glowColor = normalizeHex(raw.glowColor, accentColor);
  const glowOn = Boolean(raw.glowOn);
  const glowStrength = Math.max(0, Math.min(1, Number.isFinite(Number(raw.glowStrength)) ? Number(raw.glowStrength) : 0.65));
  const effects = normalizeEffects(raw.effects);
  const deletedAt = raw.deletedAt ? String(raw.deletedAt) : null;
  const updatedAt = raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString();

  return {
    id,
    kind,
    name,
    emoji,
    imageUrl,
    primaryColor,
    accentColor,
    glowColor,
    glowOn,
    glowStrength,
    effects,
    createdBy: String(raw.createdBy || 'Admin').slice(0, 40),
    updatedAt,
    deletedAt,
  };
}

/**
 * Compute smooth per-frame animation modifiers for lively/glowing effects.
 */
export function effectPhase(effects = [], now = Date.now(), seed = 0) {
  const list = Array.isArray(effects) ? effects : [];
  const has = (id) => list.includes(id);
  const lively = has('lively');
  const t = now * 0.001 + (Number(seed) || 0) * 1.37;

  let scale = 1;
  let bobY = 0;
  let alpha = 1;
  let glowMult = 1;
  let hueWave = 0;
  let sparkle = false;

  if (has('pulse') || lively) {
    scale += Math.sin(t * 3.4) * 0.055;
    glowMult += Math.sin(t * 3.4) * 0.25;
  }
  if (has('breathing')) {
    scale += Math.sin(t * 1.7) * 0.04;
    alpha *= 0.9 + Math.sin(t * 1.7) * 0.1;
  }
  if (has('float') || lively) {
    bobY += Math.sin(t * 2.3) * 3.2;
  }
  if (has('flicker')) {
    alpha *= 0.85 + Math.sin(t * 11.3) * 0.08 + Math.cos(t * 17.7) * 0.07;
    glowMult *= 0.78 + Math.sin(t * 9.7) * 0.22;
  }
  if (has('shimmer') || lively) {
    hueWave = (Math.sin(t * 2.8) + 1) * 0.5;
    glowMult += Math.cos(t * 4.1) * 0.2;
  }
  if (has('sparkle') || lively) {
    sparkle = true;
  }

  return {
    scale,
    bobY,
    alpha: Math.max(0.35, Math.min(1, alpha)),
    glowMult: Math.max(0.25, Math.min(1.6, glowMult)),
    hueWave,
    sparkle,
    t,
  };
}

/**
 * Resolve effective visual style for a memorial, combining built-in styles,
 * admin-published custom assets (`custom:<assetId>`), and per-memorial color/glow/effect overrides.
 */
export function resolveStyle(styleId, assets = [], memorial = null) {
  const activeAssets = (Array.isArray(assets) ? assets : []).filter((a) => a && !a.deletedAt);
  const customId = String(styleId || '').startsWith('custom:') ? String(styleId).slice(7) : null;
  const asset = customId ? activeAssets.find((a) => a.id === customId) : null;

  const hasCustomHex = Boolean(memorial?.customHex);
  const primaryColor = memorial?.customHex
    ? normalizeHex(memorial.customHex)
    : (asset?.primaryColor || null);
  const accentColor = memorial?.customAccentHex
    ? normalizeHex(memorial.customAccentHex)
    : (asset?.accentColor || primaryColor || null);
  const glowColor = memorial?.glowColor
    ? normalizeHex(memorial.glowColor)
    : (asset?.glowColor || accentColor || primaryColor || '#f5d076');
  const glowOn = memorial?.glowOn !== undefined ? Boolean(memorial.glowOn) : Boolean(asset?.glowOn);
  const glowStrength = memorial?.glowStrength !== undefined
    ? Math.max(0, Math.min(1, Number(memorial.glowStrength) || 0.65))
    : (asset?.glowStrength ?? 0.65);
  const effects = Array.isArray(memorial?.effects) && memorial.effects.length > 0
    ? normalizeEffects(memorial.effects)
    : (asset?.effects || []);
  const imageUrl = (memorial?.customImageUrl && isSafeImageUrl(memorial.customImageUrl))
    ? memorial.customImageUrl
    : (asset?.imageUrl || '');

  return {
    styleId: styleId || 'granite',
    isCustomAsset: Boolean(asset),
    asset,
    name: asset?.name || null,
    emoji: asset?.emoji || null,
    imageUrl,
    primaryColor,
    accentColor,
    glowColor,
    glowOn,
    glowStrength,
    effects,
    hasCustomVisual: Boolean(asset || hasCustomHex || imageUrl || glowOn || effects.length > 0),
  };
}

/**
 * Create an offering token for memorial `activeOfferings`.
 * - Admin asset: `asset:<id>|<emoji>|<hex>`
 * - Customer flower with color: `flower:<emoji>|<hex>`
 */
export function makeOfferingToken({ asset = null, emoji = '🌸', color = '' } = {}) {
  if (asset && asset.id) {
    const safeEmoji = String(asset.emoji || emoji || '🌸').replace(/\|/g, '');
    const hex = normalizeHex(color || asset.primaryColor, '#f5d076');
    return `asset:${asset.id}|${safeEmoji}|${hex}`;
  }
  const safeEmoji = String(emoji || '🌸').replace(/\|/g, '');
  if (color) {
    return `flower:${safeEmoji}|${normalizeHex(color, '#f5d076')}`;
  }
  return safeEmoji;
}

/**
 * Resolve an activeOffering token (`🌸`, `flower:🌸|#ff69b4`, or `asset:id|🌸|#hex`)
 * into renderable metadata with graceful fallback if asset hasn't loaded yet.
 */
export function resolveOfferingToken(token, assets = []) {
  const raw = String(token || '').trim();
  if (!raw) return { emoji: '🌸', label: 'Flower', color: '', imageUrl: '', glowOn: false, glowStrength: 0, effects: [] };

  if (raw.startsWith('asset:')) {
    const rest = raw.slice(6);
    const [id, fallbackEmoji = '🌸', fallbackHex = '#f5d076'] = rest.split('|');
    const found = (Array.isArray(assets) ? assets : []).find((a) => a && a.id === id && !a.deletedAt);
    if (found) {
      return {
        id: found.id,
        emoji: found.emoji || fallbackEmoji,
        label: found.name || 'Custom Offering',
        color: found.primaryColor || normalizeHex(fallbackHex),
        glowColor: found.glowColor || found.accentColor || found.primaryColor,
        imageUrl: found.imageUrl || '',
        glowOn: Boolean(found.glowOn),
        glowStrength: found.glowStrength ?? 0.65,
        effects: found.effects || [],
      };
    }
    return {
      id,
      emoji: fallbackEmoji,
      label: 'Custom Offering',
      color: normalizeHex(fallbackHex),
      glowColor: normalizeHex(fallbackHex),
      imageUrl: '',
      glowOn: true,
      glowStrength: 0.45,
      effects: ['lively'],
    };
  }

  if (raw.startsWith('flower:')) {
    const [emoji = '🌸', hex = '#f5d076'] = raw.slice(7).split('|');
    const color = normalizeHex(hex);
    return {
      emoji,
      label: 'Customer Flower',
      color,
      glowColor: color,
      imageUrl: '',
      glowOn: true,
      glowStrength: 0.45,
      effects: ['glow'],
    };
  }

  return {
    emoji: raw,
    label: raw,
    color: '',
    glowColor: '',
    imageUrl: '',
    glowOn: false,
    glowStrength: 0,
    effects: [],
  };
}

// --- Cached Image Loader for 2D/3D Canvas ---
const assetImageCache = new Map();

export function getCachedAssetImage(url) {
  if (!url || !isSafeImageUrl(url)) return null;
  const cached = assetImageCache.get(url);
  if (cached) {
    return cached.status === 'loaded' ? cached.img : null;
  }
  if (typeof Image === 'undefined') return null;

  const entry = { status: 'loading', img: null };
  assetImageCache.set(url, entry);

  const img = new Image();
  if (!url.startsWith('data:')) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => {
    entry.status = 'loaded';
    entry.img = img;
  };
  img.onerror = () => {
    entry.status = 'error';
  };
  img.src = url;
  return null;
}

// --- Customer Held Flower & Custom Hex Color Preferences ---
export function loadCustomerHoldPrefs() {
  const defaults = {
    flowerEmoji: '🌸',
    flowerColor: '#ff7eb6',
    glowOn: true,
  };
  try {
    const raw = localStorage.getItem(CUSTOMER_HOLD_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      flowerEmoji: String(parsed?.flowerEmoji || defaults.flowerEmoji).slice(0, 8),
      flowerColor: normalizeHex(parsed?.flowerColor, defaults.flowerColor),
      glowOn: parsed?.glowOn !== undefined ? Boolean(parsed.glowOn) : true,
    };
  } catch {
    return defaults;
  }
}

export function saveCustomerHoldPrefs(prefs) {
  const clean = {
    flowerEmoji: String(prefs?.flowerEmoji || '🌸').slice(0, 8),
    flowerColor: normalizeHex(prefs?.flowerColor, '#ff7eb6'),
    glowOn: prefs?.glowOn !== undefined ? Boolean(prefs.glowOn) : true,
  };
  try {
    localStorage.setItem(CUSTOMER_HOLD_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage limits
  }
  return clean;
}
