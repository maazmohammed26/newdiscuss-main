/**
 * sessionManager.js — Session presence tracking
 *
 * Strategy:
 *   - Each login writes a session record to RTDB: sessions/{userId}/{sessionId}
 *   - Sessions are informational and are removed on explicit logout
 *   - Opening another tab or device must never invalidate an authenticated user
 *
 * Data shape in RTDB:
 *   sessions/{userId}/{sessionId}: {
 *     createdAt: <timestamp>,
 *     deviceInfo: <string>,
 *     kicked: false | true,
 *   }
 */

import { database, ref, set, remove } from '@/lib/firebase';

// ── Generate or retrieve a stable session ID for this tab/device ──
function getOrCreateSessionId() {
  const KEY = 'discuss_session_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

// ── Device info string (best-effort) ──
function getDeviceInfo() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS device';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Unknown device';
}

// ─────────────────────────────────────────────────────────────
// registerSession
// Call this after a successful login / auth state confirmation.
// Returns an unsubscribe function to call on logout or unmount.
// ─────────────────────────────────────────────────────────────
export async function registerSession(userId) {
  if (!userId) return () => {};

  const sessionId = getOrCreateSessionId();
  const mySessionRef = ref(database, `sessions/${userId}/${sessionId}`);

  try {
    // 1. Write this session record
    await set(mySessionRef, {
      sessionId,
      createdAt: Date.now(),
      deviceInfo: getDeviceInfo(),
      kicked: false,
    });

  } catch (err) {
    console.warn('[SessionManager] registerSession error:', err?.message);
    return () => {};
  }

  // Return cleanup function for explicit logout/account deletion.
  return async () => {
    try { await remove(mySessionRef); } catch {}
  };
}

// ─────────────────────────────────────────────────────────────
// cleanupSession — call explicitly on manual sign-out
// ─────────────────────────────────────────────────────────────
export async function cleanupSession(userId) {
  if (!userId) return;
  const sessionId = getOrCreateSessionId();
  try {
    await remove(ref(database, `sessions/${userId}/${sessionId}`));
  } catch (err) {
    console.warn('[SessionManager] cleanupSession error:', err?.message);
  }
}
