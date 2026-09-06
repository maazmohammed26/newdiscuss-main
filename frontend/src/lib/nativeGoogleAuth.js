// Native SDK failures happen before Firebase authentication. Keep diagnostics
// categorical: never log callback payloads, which may contain identity tokens.
function errorDetails(value, depth = 0) {
  if (depth > 3 || value == null) return '';
  if (typeof value === 'string') return value.slice(0, 2000);
  if (typeof value === 'number') return `status code ${value}`;
  if (typeof value !== 'object') return '';
  // Only inspect known error fields; never serialize the native response.
  return ['code', 'statusCode', 'errorCode', 'message', 'error', 'error_description', 'nativeCause']
    .map(key => ['code', 'statusCode', 'errorCode'].includes(key) && /^\d{1,6}$/.test(String(value[key]))
      ? `status code ${value[key]}` : errorDetails(value[key], depth + 1)).join(' ');
}

export function nativeGoogleFailure(error) {
  const detail = errorDetails(error);
  let code = 'native-unavailable';
  let message = 'Google sign-in did not complete in this app. Try again or continue securely in your browser.';
  if (/cancelled|canceled|user cancel|12501|SIGN_IN_CANCELLED/i.test(detail)) {
    code = 'native-cancelled';
    message = 'Google sign-in was cancelled. You can try again when ready.';
  } else if (/not licen[sc]ed|unlicen[sc]ed|(?:licen[sc]e|trial|subscription).{0,60}(?:required|expired|invalid|inactive|disabled|missing)|(?:requires?|missing|expired|invalid).{0,40}licen[sc]e/i.test(detail)) {
    code = 'native-license';
    message = 'The app reported a Google sign-in license restriction. Contact Discuss support with the reference below, or continue in your browser.';
  } else if (/developer.error|status.code.?10\b|DEVELOPER_ERROR|configuration/i.test(detail)) {
    code = 'native-configuration';
    message = 'Google sign-in is unavailable in this app version. Continue in your browser, or update Discuss from your app store.';
  } else if (/no[ _-]?credentials?|credentials?.{0,30}(?:unavailable|not available)|cannot find a matching credential/i.test(detail)) {
    code = 'native-no-credentials';
    message = 'The app could not obtain a Google credential. Continue in your browser and share the reference below with Discuss support.';
  } else if (/not.supported|unsupported|not.implemented|plugin.{0,30}(?:not.enabled|disabled|unavailable|missing)/i.test(detail)) {
    code = 'native-unsupported';
    message = 'This app reported that native Google sign-in is unsupported or unavailable. Continue in your browser and share the reference below with Discuss support.';
  } else if (/missing identity token/i.test(detail)) {
    code = 'native-missing-token';
    message = 'The app returned from Google without a usable sign-in token. Continue in your browser and share the reference below with Discuss support.';
  } else if (/network|offline|connection/i.test(detail)) {
    code = 'native-network';
    message = 'Google could not connect. Check your connection and try again.';
  } else if (/timed.out|timeout/i.test(detail)) {
    code = 'native-timeout';
    message = 'Google sign-in did not respond. Close any open Google sign-in screen, then retry or continue in your browser.';
  }
  const stages = ['callback', 'timeout', 'bridge-throw', 'bridge-promise'];
  const stage = stages.includes(error?.nativeStage) ? error.nativeStage : 'unknown';
  // These values come from our allowlists, never from user data or tokens.
  const diagnostic = `G2/${code}/${stage}`;
  return {
    success: false, code, diagnostic,
    error: code === 'native-cancelled' ? message : `${message} Reference: ${diagnostic}`,
    canUseBrowser: code !== 'native-cancelled',
  };
}

export async function getMedianGoogleLogin() {
  const find = () => {
    for (const bridge of [window.median, window.gonative]) {
      const google = bridge?.socialLogin?.google;
      if (typeof google?.login === 'function') return google.login.bind(google);
    }
    return null;
  };
  for (let attempt = 0; attempt <= 50; attempt += 1) {
    const login = find();
    if (login) return login;
    if (attempt < 50) await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

export function requestMedianGoogleToken(login) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handler(value);
    };
    const fail = (error, stage) => {
      const failure = new Error(typeof error === 'string' ? error : error?.message || 'Native sign-in unavailable');
      failure.nativeCause = error;
      failure.nativeStage = stage;
      finish(reject, failure);
    };
    const timer = setTimeout(() => fail(new Error('Native sign-in timed out'), 'timeout'), 90000);
    try {
      const pending = login({ callback: response => {
        // Retain status codes beside error messages for classification.
        if (response?.error) return fail(response, 'callback');
        const token = response?.idToken || response?.credential;
        if (typeof token !== 'string' || !token.trim()) return fail(new Error('Missing identity token'), 'callback');
        finish(resolve, token);
      } });
      // Some bridge versions also return a rejecting Promise.
      if (pending?.catch) pending.catch(error => fail(error, 'bridge-promise'));
    } catch (error) { fail(error, 'bridge-throw'); }
  });
}
