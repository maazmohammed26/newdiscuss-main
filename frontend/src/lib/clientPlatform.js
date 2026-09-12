/**
 * Client Platform Detection & Android Google Play Configuration
 * Discuss Production Launch
 */

export const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=co.median.android.lpowadz';

export const ANDROID_PACKAGE_NAME = 'co.median.android.lpowadz';

export const ANDROID_STORE_PROMPT_SESSION_KEY = 'discuss_android_store_prompt_seen';

/**
 * Clean, lightweight client platform detector.
 * Uses navigator.userAgentData where supported with safe fallback to navigator.userAgent.
 * Purely local UI adaptation; no fingerprinting, no device identifiers stored or transmitted.
 *
 * @returns {'android' | 'ios' | 'desktop' | 'unknown'}
 */
export function getClientPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }

  // 1. Modern Navigator UA Data (Client Hints) where supported
  if (navigator.userAgentData?.platform) {
    const platform = String(navigator.userAgentData.platform).toLowerCase();
    if (platform === 'android') return 'android';
    if (platform === 'ios' || platform === 'ipados' || platform === 'iphone') return 'ios';
    if (['windows', 'macos', 'linux', 'chrome os', 'chromium os'].includes(platform)) {
      return 'desktop';
    }
  }

  // 2. Standard navigator.userAgent fallback
  const ua = (navigator.userAgent || '').toLowerCase();

  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }

  // iOS detection (iPhone, iPod, iPad, or iPad running modern Safari pretending to be MacIntel)
  if (
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1)
  ) {
    return 'ios';
  }

  // Desktop operating systems
  if (/windows|macintosh|mac os x|linux|cros/.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Checks whether Discuss is already installed on the Android device
 * using the standard navigator.getInstalledRelatedApps() API.
 * Gracefully returns false if unsupported, unverified, or on error.
 *
 * Note: navigator.getInstalledRelatedApps() requires a valid .well-known/assetlinks.json
 * matching the Google Play signing SHA-256 certificate.
 *
 * @returns {Promise<boolean>}
 */
export async function checkDiscussInstalled() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if (typeof navigator.getInstalledRelatedApps !== 'function') {
    return false;
  }

  try {
    const relatedApps = await navigator.getInstalledRelatedApps();
    if (!Array.isArray(relatedApps) || relatedApps.length === 0) {
      return false;
    }
    return relatedApps.some(
      (app) =>
        app.id === ANDROID_PACKAGE_NAME ||
        app.id === 'com.discuss.app' ||
        app.platform === 'play'
    );
  } catch {
    return false;
  }
}
