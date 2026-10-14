// Utility to detect if running inside Median / GoNative Android APK app or Standalone PWA
export const APK_DOWNLOAD_URL = 'https://median.co/share/bnpmley#apk';

export const isInsideAPKApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Check JS Bridge objects injected by Median.co / GoNative wrapper
  if (
    (window as any).median || 
    (window as any).gonative || 
    (window as any).isMedian ||
    (window as any).isGoNative
  ) {
    return true;
  }

  // 2. Check User Agent for Median, GoNative, or Android WebView signatures
  const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
  if (
    ua.includes('median') || 
    ua.includes('gonative') || 
    ua.includes('wv') || 
    ua.includes('webview')
  ) {
    return true;
  }

  // 3. Check Standalone / Installed PWA mode
  if (
    window.matchMedia('(display-mode: standalone)').matches || 
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as any).standalone === true
  ) {
    return true;
  }

  // 4. Check URL query string flags (e.g. ?is_apk=true or ?median=1)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get('is_apk') === 'true' || 
      urlParams.get('app') === 'median' || 
      urlParams.get('gonative') === 'true'
    ) {
      try {
        sessionStorage.setItem('cunene_is_apk_app', 'true');
      } catch {}
      return true;
    }
  } catch {}

  // 5. Check Session Storage flag
  try {
    if (
      sessionStorage.getItem('cunene_is_apk_app') === 'true' || 
      localStorage.getItem('cunene_is_apk_app') === 'true'
    ) {
      return true;
    }
  } catch {}

  return false;
};
