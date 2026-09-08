export const PLATFORM = Object.freeze({
  WEB: 'web',
  PWA: 'pwa',
  MEDIAN_ANDROID: 'median-android',
  MEDIAN_IOS: 'median-ios',
});

const hasWindow = () => typeof window !== 'undefined';

export const isNativeApp = () => hasWindow() && Boolean(
  window.median
  || window.gonative
  || /median|gonative/i.test(window.navigator?.userAgent || '')
);

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
  getMedianBridge,
  getNativeOneSignalBridge,
  promptNativeLocationServices,
  navigateNative,
};
