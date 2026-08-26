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
  const token = await user.getIdToken();
  const response = await fetch('/api/audio-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
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

export const setAudioCallingPreference = (enabled) =>
  request('setPreference', { enabled });

export const subscribeToIncomingCalls = (userId, callback) => {
  if (!userId) return () => {};
  const invitesRef = ref(database, `callInvites/${userId}`);
  const handler = (snapshot) => {
    const now = Date.now();
    const calls = snapshot.exists()
      ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value }))
        .filter((invite) => !invite.expiresAt || invite.expiresAt > now)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : [];
    callback(calls);
  };
  onValue(invitesRef, handler);
  return () => off(invitesRef, 'value', handler);
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
