import { useState, useEffect } from 'react';

export const MOBILE_HUD_BREAKPOINT = 860;

/**
 * Detects whether the app is running inside the Nevermore Garden Android APK WebView.
 * Never returns true on regular mobile or desktop web browsers.
 */
export function isApkEnvironment() {
  if (typeof window === 'undefined') return false;
  try {
    const search = window.location?.search || '';
    if (new URLSearchParams(search).get('apk') === '1') return true;
    if (window.location?.protocol === 'file:') return true;
    const ua = window.navigator?.userAgent || '';
    if (/EvergreenPawsAPK/i.test(ua)) return true;
    // Android WebView includes "; wv)" or " wv " in its User-Agent
    if (/; wv\)/i.test(ua) || (/\bwv\b/i.test(ua) && /Android/i.test(ua))) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * Returns true when running in Android APK or mobile web viewport (<= 860px width),
 * updating automatically on viewport resize / orientation change.
 */
export function useIsMobileHud(isApk = false) {
  const [isMobileWidth, setIsMobileWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_HUD_BREAKPOINT : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setIsMobileWidth(window.innerWidth <= MOBILE_HUD_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return Boolean(isApk || isMobileWidth);
}
