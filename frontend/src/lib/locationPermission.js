const DEFAULT_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 30000,
};

export const LOCATION_REQUEST_COOLDOWN_MS = 2500;
export const LOCATION_SUCCESS_CLOSE_DELAY_MS = 1200;
export const DEVRADAR_PROMPT_SNOOZE_MS = 300000;

const queryGeolocationPermission = async () => {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission?.state || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const getCurrentPositionWithAndroidSupport = ({ options = DEFAULT_GEO_OPTIONS } = {}) => {
  if (!navigator?.geolocation) {
    return Promise.resolve({
      ok: false,
      reason: 'unsupported',
      message: 'Geolocation is not supported on this device.',
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, position }),
      async (error) => {
        if (!error) {
          resolve({ ok: false, reason: 'unknown', message: 'Unable to access your location.' });
          return;
        }

        if (error.code === 1) {
          const permissionState = await queryGeolocationPermission();
          resolve({
            ok: false,
            reason: permissionState === 'denied' ? 'blocked' : 'denied',
            permissionState,
            message:
              permissionState === 'denied'
                ? 'Location permission is blocked in browser settings.'
                : 'Location permission request was dismissed.',
            error,
          });
          return;
        }

        if (error.code === 2) {
          resolve({
            ok: false,
            reason: 'unavailable',
            message: 'Location is unavailable. Please turn on GPS and internet.',
            error,
          });
          return;
        }

        if (error.code === 3) {
          resolve({
            ok: false,
            reason: 'timeout',
            message: 'Location request timed out. Please try again.',
            error,
          });
          return;
        }

        resolve({ ok: false, reason: 'unknown', message: 'Unable to access your location.', error });
      },
      options
    );
  });
};

export const getFriendlyLocationErrorMessage = (reason) => {
  switch (reason) {
    case 'unsupported':
      return 'Location is not supported on this device/browser.';
    case 'denied':
      return 'Location request was cancelled. Please tap confirm to try again.';
    case 'blocked':
      return 'Location is blocked for Discuss. Please allow it in site settings.';
    case 'unavailable':
      return 'Could not detect your location. Turn on GPS/location services and retry.';
    case 'timeout':
      return 'Location request timed out. Please retry in a stronger signal area.';
    default:
      return 'Could not update location right now. Please try again.';
  }
};
