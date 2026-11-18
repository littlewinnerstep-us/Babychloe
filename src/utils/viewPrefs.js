// Persistent viewer & first-visit tip preferences

export const VIEW_PREFS_STORAGE_KEY = 'evergreen_paws_view_prefs_v1';
export const TIPS_PREFS_STORAGE_KEY = 'evergreen_paws_tips_v1';

const DEFAULT_VIEW_PREFS = {
  zoom2d: 0,
  zoom3d: 0,
  cameraMode: 'follow',
  yaw: 0,
};

const DEFAULT_TIPS_PREFS = {
  tipsEnabled: true,
  guideCompleted: false,
  zoomTipShown: false,
  cameraTipShown: false,
};

export function loadViewPrefs() {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_VIEW_PREFS };
    const raw = localStorage.getItem(VIEW_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VIEW_PREFS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_VIEW_PREFS };
    const zoom2d = Number.isFinite(Number(parsed.zoom2d))
      ? Math.max(0, Math.min(100, Number(parsed.zoom2d)))
      : 0;
    const zoom3d = Number.isFinite(Number(parsed.zoom3d))
      ? Math.max(0, Math.min(100, Number(parsed.zoom3d)))
      : 0;
    const cameraMode =
      parsed.cameraMode === 'close' || parsed.cameraMode === 'high' || parsed.cameraMode === 'follow'
        ? parsed.cameraMode
        : 'follow';
    const yaw = Number.isFinite(Number(parsed.yaw)) ? Number(parsed.yaw) : 0;
    return { zoom2d, zoom3d, cameraMode, yaw };
  } catch {
    return { ...DEFAULT_VIEW_PREFS };
  }
}

export function saveViewPrefs(patch) {
  try {
    if (typeof window === 'undefined' || !patch || typeof patch !== 'object') return;
    const current = loadViewPrefs();
    const next = { ...current, ...patch };
    localStorage.setItem(VIEW_PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export function loadTipsPrefs() {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_TIPS_PREFS };
    const raw = localStorage.getItem(TIPS_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TIPS_PREFS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_TIPS_PREFS };
    return {
      tipsEnabled: parsed.tipsEnabled !== false,
      guideCompleted: Boolean(parsed.guideCompleted),
      zoomTipShown: Boolean(parsed.zoomTipShown),
      cameraTipShown: Boolean(parsed.cameraTipShown),
    };
  } catch {
    return { ...DEFAULT_TIPS_PREFS };
  }
}

export function saveTipsPrefs(patch) {
  try {
    if (typeof window === 'undefined' || !patch || typeof patch !== 'object') return;
    const current = loadTipsPrefs();
    const next = { ...current, ...patch };
    localStorage.setItem(TIPS_PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}
