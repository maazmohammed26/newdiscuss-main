// The relay database sees ciphertext only. The key travels in the URL fragment
// (never sent in HTTP requests) and stays in memory in the initiating app.
export const RELAY_TTL = 120000;
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const importKey = secret => crypto.subtle.importKey('raw', decode(secret), 'AES-GCM', false, ['encrypt', 'decrypt']);
export function createGoogleRelay() {
  if (!crypto?.subtle) throw new Error('Secure browser sign-in requires HTTPS. Please update Discuss and try again.');
  return {
    flowId: `flow_${encode(crypto.getRandomValues(new Uint8Array(24)))}`,
    secret: encode(crypto.getRandomValues(new Uint8Array(32))),
    expiresAt: Date.now() + RELAY_TTL,
  };
}
export function validGoogleRelay(flow) {
  return /^flow_[A-Za-z0-9_-]{32}$/.test(flow.flowId || '') && /^[A-Za-z0-9_-]{43}$/.test(flow.secret || '') &&
    Number.isFinite(flow.expiresAt) && flow.expiresAt > Date.now() && flow.expiresAt <= Date.now() + RELAY_TTL;
}
export async function encryptGoogleRelay(flow, idToken) {
  if (!validGoogleRelay(flow)) throw new Error('This sign-in link has expired. Start again from Discuss.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(flow.flowId) },
    await importKey(flow.secret), new TextEncoder().encode(JSON.stringify({ idToken, expiresAt: flow.expiresAt })));
  return { status: 'success', version: 2, iv: encode(iv), ciphertext: encode(ciphertext), expiresAt: flow.expiresAt };
}
export async function decryptGoogleRelay(flow, envelope) {
  if (!validGoogleRelay(flow) || envelope?.version !== 2 || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > 32768 || typeof envelope.iv !== 'string' || envelope.iv.length !== 16) throw new Error('Invalid or expired sign-in response. Please try again.');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(envelope.iv), additionalData: new TextEncoder().encode(flow.flowId) },
    await importKey(flow.secret), decode(envelope.ciphertext));
  const result = JSON.parse(new TextDecoder().decode(plaintext));
  if (result.expiresAt !== flow.expiresAt || Date.now() >= result.expiresAt || typeof result.idToken !== 'string' || !result.idToken) throw new Error('This sign-in response has expired. Please try again.');
  return result.idToken;
}
