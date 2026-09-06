import { getMedianGoogleLogin, requestMedianGoogleToken, nativeGoogleFailure } from './nativeGoogleAuth';

afterEach(() => { jest.useRealTimers(); delete window.median; delete window.gonative; });
test('native success settles once, ignoring late duplicate responses', async () => {
  let callback;
  const result = requestMedianGoogleToken(options => { callback = options.callback; });
  callback({ idToken: 'google-token' });
  callback({ error: 'late error' });
  await expect(result).resolves.toBe('google-token');
});
test.each([null, {}, { idToken: {} }, { credential: '' }])('rejects malformed native response %p', async response => {
  await expect(requestMedianGoogleToken(({ callback }) => callback(response))).rejects.toThrow('Missing identity token');
});
test('handles bridge promise rejection immediately', async () => {
  await expect(requestMedianGoogleToken(() => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
});
test('handles synchronous native failure', async () => {
  await expect(requestMedianGoogleToken(() => { throw new Error('not available'); })).rejects.toThrow('not available');
});
test('times out and ignores a late token', async () => {
  jest.useFakeTimers();
  let callback;
  const result = requestMedianGoogleToken(options => { callback = options.callback; });
  const assertion = expect(result).rejects.toThrow('timed out');
  jest.advanceTimersByTime(90000);
  callback({ idToken: 'late-token' });
  await assertion;
});
test.each(['median', 'gonative'])('waits for delayed %s bridge and preserves receiver', async name => {
  jest.useFakeTimers();
  const result = getMedianGoogleLogin();
  const google = { login() { return this; } };
  window[name] = { socialLogin: { google } };
  jest.advanceTimersByTime(100);
  expect((await result)()).toBe(google);
});
test.each([
  [{ code: 'DEVELOPER_ERROR', message: '10' }, 'native-configuration', true],
  ['user canceled', 'native-cancelled', false],
  ['network error', 'native-network', true],
  ['timed out', 'native-timeout', true],
  [null, 'native-unavailable', true],
])('classifies %p without inventing Play services advice', (error, code, canUseBrowser) => {
  expect(nativeGoogleFailure(error)).toMatchObject({ code, canUseBrowser });
  expect(nativeGoogleFailure(error).error).not.toContain('Google Play services');
});

test.each([
  [{ error: { message: 'License required for Social Login' } }, 'native-license'],
  [{ error: 'Trial expired' }, 'native-license'],
  [{ error: 'Google sign-in is not supported in legacy mode' }, 'native-unsupported'],
  [{ error: 'NoCredentialException' }, 'native-no-credentials'],
  [{ error: 'No credentials available' }, 'native-no-credentials'],
  [{ error: 'Sign-in failed', statusCode: 10 }, 'native-configuration'],
  [{ error: 'Sign-in failed', errorCode: '10' }, 'native-configuration'],
])('preserves native callback reason %p in a safe reference', async (response, code) => {
  const failure = await requestMedianGoogleToken(({ callback }) => callback(response)).catch(nativeGoogleFailure);
  expect(failure.code).toBe(code);
  expect(failure.error).toContain(`G2/${code}/callback`);
});

test('missing token, rejected promise and synchronous error have distinct references', async () => {
  const missing = await requestMedianGoogleToken(({ callback }) => callback(null)).catch(nativeGoogleFailure);
  const promise = await requestMedianGoogleToken(() => Promise.reject(new Error('not supported'))).catch(nativeGoogleFailure);
  const thrown = await requestMedianGoogleToken(() => { throw new Error('License expired'); }).catch(nativeGoogleFailure);
  expect(missing.diagnostic).toBe('G2/native-missing-token/callback');
  expect(promise.diagnostic).toBe('G2/native-unsupported/bridge-promise');
  expect(thrown.diagnostic).toBe('G2/native-license/bridge-throw');
});

test('references never expose arbitrary native messages, tokens, or account data', async () => {
  const response = { error: 'unrecognized failure for private@example.com', idToken: 'secret-token', code: 'sensitive-unknown-code' };
  const failure = await requestMedianGoogleToken(({ callback }) => callback(response)).catch(nativeGoogleFailure);
  expect(failure.diagnostic).toBe('G2/native-unavailable/callback');
  expect(JSON.stringify(failure)).not.toMatch(/private@example|secret-token|sensitive-unknown-code/);
});

test('cyclic nested error does not break diagnosis or expose raw content', () => {
  const error = { message: 'unknown' };
  error.error = error;
  expect(nativeGoogleFailure(error).code).toBe('native-unavailable');
});
