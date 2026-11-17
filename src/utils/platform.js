/**
 * Detects whether the app is running inside the Evergreen Paws Android APK WebView.
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
