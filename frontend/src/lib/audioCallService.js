import {
  auth,
  database,
  ref,
  onValue,
  off,
} from './firebase';

export const CALL_MAX_PARTICIPANTS = 4;
export const CALL_FIRST_PHASE_MESSAGE = 'Sorry, it is us, not you. Discuss audio calling is in its first phase and the available calling capacity has been reached. We are improving it.';

const request = async (action, payload = {}) => {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error('Sign in to use Discuss audio calling.');
    error.code = 'unauthenticated';
    throw error;
  }

  const send = (token) => fetch('/api/audio-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  // Firebase normally refreshes ID tokens automatically. Mobile WebViews and
  // resumed PWAs can occasionally retain a stale token, so retry once with a
  // forced refresh before asking the user to sign in again.
  let response = await send(await user.getIdToken());
  if (response.status === 401 && auth.currentUser) {
    response = await send(await auth.currentUser.getIdToken(true));
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'The audio call could not be connected. Please try again.');
    error.code = result.code || `http-${response.status}`;
    error.status = response.status;
    throw error;
  }
  return result;
};

export const createAudioCall = (targetId, chatId) =>
  request('create', { targetId, chatId });

export const joinAudioCall = (callId) =>
  request('join', { callId });

export const declineAudioCall = (callId) =>
  request('decline', { callId });

export const leaveAudioCall = (callId) =>
  request('leave', { callId });

export const inviteAudioCallParticipant = (callId, targetId) =>
  request('invite', { callId, targetId });

export const cancelAudioCallInvite = (callId, targetId) =>
  request('cancelInvite', { callId, targetId });

export const expireAudioCallInvite = (callId) =>
  request('expireInvite', { callId });

export const setAudioCallingPreference = (enabled) =>
  request('setPreference', { enabled });

export const subscribeToIncomingCalls = (userId, callback) => {
  if (!userId) return () => {};
  const invitesRef = ref(database, `callInvites/${userId}`);
  let expiryTimer = null;
  const handler = (snapshot) => {
    const now = Date.now();
    const allCalls = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
      : [];
    const calls = allCalls.filter((invite) => !invite.expiresAt || invite.expiresAt > now)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(calls);
    if (expiryTimer) window.clearTimeout(expiryTimer);
    const nextExpiry = calls.reduce((minimum, invite) => invite.expiresAt && (!minimum || invite.expiresAt < minimum) ? invite.expiresAt : minimum, 0);
    if (nextExpiry) expiryTimer = window.setTimeout(() => handler(snapshot), Math.max(0, nextExpiry - Date.now()) + 50);
  };
  onValue(invitesRef, handler);
  return () => {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    off(invitesRef, 'value', handler);
  };
};

export const subscribeToCall = (callId, callback) => {
  if (!callId) return () => {};
  const callRef = ref(database, `calls/${callId}`);
  const handler = (snapshot) => callback(snapshot.exists() ? { id: callId, ...snapshot.val() } : null);
  onValue(callRef, handler);
  return () => off(callRef, 'value', handler);
};

export const isQuotaError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('resource-exhausted')
    || code.includes('livekit-quota')
    || message.includes('quota')
    || message.includes('capacity has been reached')
    || message.includes('resource exhausted');
};

export const friendlyCallError = (error) => {
  if (isQuotaError(error)) return CALL_FIRST_PHASE_MESSAGE;
  const raw = String(error?.message || '').replace(/^Firebase:\s*/i, '');
  return raw || 'The audio call could not be connected. Please try again.';
};

export const formatCallDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = Math.floor(total % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
};
