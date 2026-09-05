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
