// Native SDK failures happen before Firebase authentication. Keep diagnostics
// categorical: never log callback payloads, which may contain identity tokens.
export function nativeGoogleFailure(error) {
  const detail = typeof error === 'string' ? error : [error?.code, error?.message, error?.error].filter(Boolean).join(' ');
  let code = 'native-unavailable';
  let message = 'Google sign-in could not start in this app. Try again or continue securely in your browser.';
  if (/cancelled|canceled|user cancel|12501|SIGN_IN_CANCELLED/i.test(detail)) {
    code = 'native-cancelled';
    message = 'Google sign-in was cancelled. You can try again when ready.';
  } else if (/developer.error|status.code.?10\b|DEVELOPER_ERROR|configuration/i.test(detail)) {
    code = 'native-configuration';
    message = 'Google sign-in is unavailable in this app version. Continue in your browser, or update Discuss from your app store.';
  } else if (/network|offline|connection/i.test(detail)) {
    code = 'native-network';
    message = 'Google could not connect. Check your connection and try again.';
  } else if (/timed.out|timeout/i.test(detail)) {
    code = 'native-timeout';
    message = 'Google sign-in did not respond. Close any open Google sign-in screen, then retry or continue in your browser.';
  }
  return { success: false, code, error: message, canUseBrowser: code !== 'native-cancelled' };
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
    const fail = error => finish(reject, error || new Error('Native sign-in unavailable'));
    const timer = setTimeout(() => fail(new Error('Native sign-in timed out')), 90000);
    try {
      const pending = login({ callback: response => {
        if (response?.error) return fail(response.error);
        const token = response?.idToken || response?.credential;
        if (typeof token !== 'string' || !token.trim()) return fail(new Error('Missing identity token'));
        finish(resolve, token);
      } });
      // Some bridge versions also return a rejecting Promise.
      if (pending?.catch) pending.catch(fail);
    } catch (error) { fail(error); }
  });
}
