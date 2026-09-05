/** @jest-environment node */
import { createGoogleRelay, encryptGoogleRelay, decryptGoogleRelay, validGoogleRelay, RELAY_TTL } from './googleAuthRelay';

beforeAll(() => {
  Object.defineProperty(global, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
  global.btoa = s => Buffer.from(s, 'binary').toString('base64');
  global.atob = s => Buffer.from(s, 'base64').toString('binary');
});
test('relay contains no readable credential, and decrypts for the initiating app', async () => {
  const flow = createGoogleRelay();
  const envelope = await encryptGoogleRelay(flow, 'secret-google-id-token');
  expect(JSON.stringify(envelope)).not.toContain('secret-google-id-token');
  expect(envelope.googleIdToken).toBeUndefined();
  await expect(decryptGoogleRelay(flow, envelope)).resolves.toBe('secret-google-id-token');
});
test('wrong key and wrong flow cannot decrypt a response', async () => {
  const flow = createGoogleRelay();
  const other = createGoogleRelay();
  const envelope = await encryptGoogleRelay(flow, 'token');
  await expect(decryptGoogleRelay({ ...flow, secret: other.secret }, envelope)).rejects.toThrow();
  await expect(decryptGoogleRelay({ ...flow, flowId: other.flowId }, envelope)).rejects.toThrow();
});
test('rejects expired links, legacy plaintext and modified ciphertext', async () => {
  const flow = createGoogleRelay();
  const envelope = await encryptGoogleRelay(flow, 'token');
  await expect(decryptGoogleRelay({ ...flow, expiresAt: Date.now() - 1 }, envelope)).rejects.toThrow();
  await expect(decryptGoogleRelay(flow, { googleIdToken: 'token' })).rejects.toThrow();
  await expect(decryptGoogleRelay(flow, { ...envelope, ciphertext: 'AAAA' })).rejects.toThrow();
});
test('validates flow structure and bounds lifetime', () => {
  const flow = createGoogleRelay();
  expect(validGoogleRelay(flow)).toBe(true);
  expect(validGoogleRelay({ ...flow, flowId: '../users' })).toBe(false);
  expect(validGoogleRelay({ ...flow, expiresAt: Date.now() + RELAY_TTL * 2 })).toBe(false);
});
