export const PLATFORM = Object.freeze({
  WEB: 'web',
  PWA: 'pwa',
  MEDIAN_ANDROID: 'median-android',
  MEDIAN_IOS: 'median-ios',
});

const hasWindow = () => typeof window !== 'undefined';

export const isMedianApp = () => {
  if (!hasWindow()) return false;
  const ua = (window.navigator?.userAgent || '').toLowerCase();
  return Boolean(
    ua.includes('median')
    || ua.includes('gonative')
    || window.median
    || window.gonative
  );
};

export const isNativeApp = () => {
  if (!hasWindow()) return false;
  return Boolean(
    isMedianApp()
    || (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
  );
};

export const getPlatform = () => {
  if (isNativeApp()) {
    return /iphone|ipad|ipod/i.test(window.navigator?.userAgent || '')
      ? PLATFORM.MEDIAN_IOS
      : PLATFORM.MEDIAN_ANDROID;
  }
  if (hasWindow() && (
    window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator?.standalone === true
  )) return PLATFORM.PWA;
  return PLATFORM.WEB;
};

export const getMedianBridge = () => {
  if (!isNativeApp()) return null;
  return window.median || window.gonative || null;
};

let nativeSplashDismissed = false;

/**
 * Dismisses the Median native launch/splash screen once the React app shell is ready.
 * Intentionally idempotent — safe to call multiple times, dismissal executes at most once.
 *
 * @returns {boolean} true if dismissal bridge was triggered or already dismissed
 */
export const hideNativeSplash = () => {
  if (!isNativeApp() && !isMedianApp()) return false;
  if (nativeSplashDismissed) return true;

  const tryHide = () => {
    if (nativeSplashDismissed) return true;
    const bridge = getMedianBridge();
    try {
      if (bridge?.screen?.splash?.hide) {
        bridge.screen.splash.hide();
        nativeSplashDismissed = true;
        return true;
      }
    } catch (_) {}
    return false;
  };

  if (tryHide()) return true;

  if (hasWindow()) {
    const timer = window.setInterval(() => {
      if (tryHide()) {
        window.clearInterval(timer);
      }
    }, 100);
    window.setTimeout(() => window.clearInterval(timer), 3000);
  }
  return false;
};

export const _resetNativeSplashDismissed = () => {
  nativeSplashDismissed = false;
};

export const getNativeOneSignalBridge = async ({ timeoutMs = 8000 } = {}) => {
  if (!isNativeApp()) return null;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const root = getMedianBridge();
    const bridge = root?.onesignal;
    if (bridge) return bridge;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
};

export const promptNativeLocationServices = () => {
  const bridge = getMedianBridge();
  try {
    bridge?.android?.geoLocation?.promptLocationServices?.();
    return true;
  } catch (_) {
    return false;
  }
};

export const navigateNative = (relativeUrl) => {
  const url = String(relativeUrl || '/');
  const bridge = getMedianBridge();
  try {
    if (bridge?.window?.open) {
      bridge.window.open({ url, target: '_self' });
      return true;
    }
  } catch (_) {}
  return false;
};

export default {
  getPlatform,
  isNativeApp,
  isMedianApp,
  getMedianBridge,
  getNativeOneSignalBridge,
  promptNativeLocationServices,
  navigateNative,
  hideNativeSplash,
};
