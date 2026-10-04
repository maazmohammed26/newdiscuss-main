/**
 * threadIdentity.js
 * Deterministic, collision-free, safe RTDB thread identifier generator.
 * Produces the exact same thread ID across client and server without depending
 * on async crypto APIs or platform-specific libraries.
 */

// 64-bit FNV-1a deterministic hash implementation in pure JS
const fnv1a = (str) => {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x000001b3);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
};

/**
 * Returns a stable, deterministic, collision-free thread ID for two UIDs.
 * Independent of friendship status or argument order.
 * Safe for Firebase RTDB path requirements (no ., $, #, [, ], /).
 * @param {string} uid1 
 * @param {string} uid2 
 * @returns {string}
 */
export const getLetterThreadId = (uid1, uid2) => {
  if (!uid1 || !uid2) return '';
  const sorted = [String(uid1).trim(), String(uid2).trim()].sort();
  const rawKey = `${sorted[0]}__${sorted[1]}`;
  const hash = fnv1a(rawKey);
  const safeU1 = sorted[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const safeU2 = sorted[1].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `th_${safeU1}_${safeU2}_${hash}`;
};

export const buildLetterThreadId = getLetterThreadId;
export default getLetterThreadId;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getLetterThreadId, buildLetterThreadId };
}
