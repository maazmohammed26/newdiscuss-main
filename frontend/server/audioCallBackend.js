'use strict';

const admin = require('firebase-admin');
const { AccessToken, WebhookReceiver } = require('livekit-server-sdk');

const CALL_MAX_PARTICIPANTS = 4;
const CALL_RING_TIMEOUT_MS = 45 * 1000;
const ONESIGNAL_APP_ID = '280791b6-7711-4b32-8897-449efe155f2b';
const PRIMARY_DATABASE_URL = process.env.PRIMARY_DATABASE_URL
  || 'https://discuss-13fbc-default-rtdb.firebaseio.com';
const SECONDARY_DATABASE_URL = process.env.SECONDARY_DATABASE_URL
  || 'https://discussit-5879b-default-rtdb.firebaseio.com';
const CHATS_DATABASE_URL = process.env.CHATS_DATABASE_URL
  || 'https://discuss-f1f56-default-rtdb.firebaseio.com';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const getServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new ApiError(503, 'server-not-configured', 'Audio calling is temporarily unavailable.');
  try {
    const value = JSON.parse(raw);
    if (value.private_key) value.private_key = value.private_key.replace(/\\n/g, '\n');
    return value;
  } catch (_) {
    throw new ApiError(503, 'server-not-configured', 'Audio calling is temporarily unavailable.');
  }
};

let apps;
const getApps = () => {
  if (apps) return apps;
  const credential = admin.credential.cert(getServiceAccount());
  apps = {
    primary: admin.apps.find((app) => app.name === 'discuss-audio-primary')
      || admin.initializeApp({ credential, databaseURL: PRIMARY_DATABASE_URL }, 'discuss-audio-primary'),
  };
  return apps;
};

const primaryDb = () => getApps().primary.database();

// The existing secondary and private-chat web apps use their Realtime
// Databases without a separate Firebase Auth session. Mirror that same rules-
// controlled REST access from the authenticated Vercel backend while keeping
// the primary database and token verification on a dedicated service account.
const auxiliaryRequest = async (baseUrl, path, method = 'GET', body) => {
  const safePath = String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${safePath}.json`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    console.error('[AudioCall] Auxiliary database request failed:', response.status, safePath);
    throw new ApiError(503, 'database-unavailable', 'Audio calling is temporarily unavailable.');
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
};

const auxiliaryGet = (baseUrl, path) => auxiliaryRequest(baseUrl, path);
const auxiliarySet = (baseUrl, path, value) => auxiliaryRequest(baseUrl, path, 'PUT', value);
const auxiliaryUpdate = (baseUrl, path, value) => auxiliaryRequest(baseUrl, path, 'PATCH', value);

const requireLiveKit = () => {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new ApiError(503, 'server-not-configured', 'Audio calling is temporarily unavailable.');
  }
  return { url, apiKey, apiSecret };
};

const cleanId = (value, field = 'callId') => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(value)) {
    throw new ApiError(400, 'invalid-argument', `${field} is invalid.`);
  }
  return value;
};

const verifyUser = async (authorization = '') => {
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, 'unauthenticated', 'Sign in to use Discuss audio calling.');
  try {
    // Cryptographic verification is sufficient here and does not require the
    // Vercel service account to have broad Firebase Authentication user-read
    // permissions. Revocation-aware verification performs an additional
    // account lookup and was incorrectly turning valid sessions into 401s.
    return await getApps().primary.auth().verifyIdToken(match[1]);
  } catch (error) {
    console.warn('[AudioCall] Token verification failed:', error?.code || 'unknown');
    throw new ApiError(401, 'unauthenticated', 'Your session has expired. Please sign in again.');
  }
};

const getCallUser = async (uid) => {
  const snapshot = await primaryDb().ref(`users/${uid}`).once('value');
  if (!snapshot.exists()) throw new ApiError(404, 'not-found', 'This Discuss account is unavailable.');
  const value = snapshot.val() || {};
  return {
    id: uid,
    username: String(value.username || value.displayName || 'Discuss user').slice(0, 80),
    photoUrl: String(value.photo_url || value.photoURL || '').slice(0, 2048),
    callingEnabled: value.callingEnabled !== false,
  };
};

const assertFriendCanCall = async (inviterId, targetId) => {
  const [relationshipSnap, target] = await Promise.all([
    auxiliaryGet(SECONDARY_DATABASE_URL, `relationships/${inviterId}/friends/${targetId}`),
    getCallUser(targetId),
  ]);
  const relationship = relationshipSnap || {};
  if (relationship.status !== 'active' || relationship.chatEnabled !== true) {
    throw new ApiError(403, 'permission-denied', 'Audio calls are available between active friends.');
  }
  if (!target.callingEnabled) {
    throw new ApiError(412, 'calling-disabled', `@${target.username} has turned off audio calling.`);
  }
  return target;
};

const normalizeParticipants = (participants, chatId) => {
  if (Array.isArray(participants)) return participants;
  if (participants && typeof participants === 'object') return Object.keys(participants);
  return String(chatId || '').split('_').filter(Boolean);
};

const assertPrivateChatCanCall = async (inviterId, targetId, chatId) => {
  const [target, chatSnap] = await Promise.all([
    assertFriendCanCall(inviterId, targetId),
    auxiliaryGet(CHATS_DATABASE_URL, `chats/${chatId}`),
  ]);
  const chat = chatSnap || {};
  if (chat.status === 'blocked' || chat.blockedBy) {
    throw new ApiError(403, 'permission-denied', 'Audio calling is unavailable in this conversation.');
  }
  const participants = normalizeParticipants(chat.participants, chatId);
  if (!participants.includes(inviterId) || !participants.includes(targetId)) {
    throw new ApiError(403, 'permission-denied', 'This private conversation is unavailable.');
  }
  return target;
};

const createParticipantToken = async (call, participant) => {
  const { apiKey, apiSecret } = requireLiveKit();
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participant.id,
    name: participant.username,
    ttl: '24h',
    metadata: JSON.stringify({
      username: participant.username,
      photoUrl: participant.photoUrl,
      callId: call.id,
    }),
  });
  token.addGrant({
    roomJoin: true,
    room: call.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
};

const publicCall = (call) => ({
  id: call.id,
  roomName: call.roomName,
  chatId: call.chatId,
  createdBy: call.createdBy,
  status: call.status,
  createdAt: call.createdAt,
  startedAt: call.startedAt || null,
  expiresAt: call.expiresAt,
  participants: call.participants || {},
});

const sendCallPush = async (targetId, caller, callId) => {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) return false;
  const targetUrl = `https://www.discussit.in/chat/${caller.id}?call=${callId}`;
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${apiKey}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [targetId] },
      target_channel: 'push',
      headings: { en: 'Incoming Discuss audio call' },
      contents: { en: `@${caller.username} is calling you` },
      web_url: targetUrl,
      ios_sound: 'default',
      priority: 10,
      data: {
        type: 'audio_call',
        callId,
        callerId: caller.id,
        url: `/chat/${caller.id}?call=${callId}`,
        targetUrl,
      },
    }),
  });
  if (!response.ok) throw new Error(`OneSignal returned ${response.status}`);
  return true;
};

const writeCallLog = async (call, status, endedAt) => {
  if (!call.chatId || call.logWritten) return;
  const joined = Object.values(call.participants || {}).filter((person) => person.joinedAt);
  const startedAt = call.startedAt || null;
  const durationSeconds = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : 0;
  const messageId = primaryDb().ref('callLogIds').push().key;
  const message = {
    type: 'audio_call',
    sender: 'system',
    timestamp: new Date(endedAt).toISOString(),
    read: true,
    status: 'sent',
    call: {
      callId: call.id,
      status,
      startedAt,
      endedAt,
      durationSeconds,
      participants: joined.map((person) => ({
        id: person.id,
        username: person.username,
        photoUrl: person.photoUrl || '',
        joinedAt: person.joinedAt,
        leftAt: person.leftAt || null,
      })),
    },
  };
  await auxiliarySet(CHATS_DATABASE_URL, `messages/${call.chatId}/${messageId}`, message);
  const timestamp = message.timestamp;
  await auxiliaryUpdate(CHATS_DATABASE_URL, `chats/${call.chatId}`, {
    lastMessage: { text: status === 'missed' ? 'Missed audio call' : 'Audio call', sender: 'system', timestamp },
  });
  const chat = await auxiliaryGet(CHATS_DATABASE_URL, `chats/${call.chatId}`);
  const chatParticipants = normalizeParticipants(chat?.participants, call.chatId);
  await Promise.all(chatParticipants.map((uid) => auxiliaryUpdate(CHATS_DATABASE_URL, `userChats/${uid}/${call.chatId}`, {
    lastMessage: status === 'missed' ? 'Missed audio call' : 'Audio call',
    lastMessageTime: timestamp,
  })));
  await primaryDb().ref(`calls/${call.id}/logWritten`).set(true);
};

const finalizeCall = async (callId, requestedStatus = null) => {
  const callRef = primaryDb().ref(`calls/${callId}`);
  const snapshot = await callRef.once('value');
  if (!snapshot.exists()) return null;
  const call = { id: callId, ...snapshot.val() };
  if (call.finalizedAt) {
    if (!call.logWritten) await writeCallLog(call, call.status, call.finalizedAt);
    return call;
  }
  const endedAt = Date.now();
  const status = requestedStatus || (call.startedAt ? 'completed' : 'missed');
  await callRef.update({ status, endedAt, finalizedAt: endedAt });
  await Promise.all(Object.keys(call.participants || {}).map((uid) =>
    primaryDb().ref(`callInvites/${uid}/${callId}`).remove()));
  const finalCall = { ...call, status, endedAt, finalizedAt: endedAt };
  await writeCallLog(finalCall, status, endedAt).catch((error) => {
    console.error('[AudioCall] Call log failed:', error.message);
  });
  return finalCall;
};

const createCall = async (uid, body) => {
  const targetId = cleanId(body.targetId, 'targetId');
  const chatId = cleanId(body.chatId, 'chatId');
  if (uid === targetId) throw new ApiError(400, 'invalid-argument', 'You cannot call yourself.');
  const [caller, target] = await Promise.all([
    getCallUser(uid),
    assertPrivateChatCanCall(uid, targetId, chatId),
  ]);
  const callRef = primaryDb().ref('calls').push();
  const callId = callRef.key;
  const now = Date.now();
  const call = {
    id: callId,
    roomName: `call_${callId}`,
    chatId,
    createdBy: uid,
    status: 'ringing',
    createdAt: now,
    expiresAt: now + CALL_RING_TIMEOUT_MS,
    participants: {
      [uid]: { ...caller, state: 'joined', invitedAt: now, joinedAt: now },
      [targetId]: { ...target, state: 'invited', invitedBy: uid, invitedAt: now },
    },
  };
  await Promise.all([
    callRef.set(call),
    primaryDb().ref(`callInvites/${targetId}/${callId}`).set({
      callId, caller, chatId, createdAt: now, expiresAt: call.expiresAt,
    }),
  ]);
  sendCallPush(targetId, caller, callId).catch((error) => console.warn('[AudioCall] Push failed:', error.message));
  return { call: publicCall(call), serverUrl: requireLiveKit().url, token: await createParticipantToken(call, caller) };
};

const joinCall = async (uid, body) => {
  const callId = cleanId(body.callId);
  const callRef = primaryDb().ref(`calls/${callId}`);
  const snapshot = await callRef.once('value');
  if (!snapshot.exists()) throw new ApiError(404, 'not-found', 'This audio call has ended.');
  const call = { id: callId, ...snapshot.val() };
  if (!call.participants?.[uid]) throw new ApiError(403, 'permission-denied', 'You were not invited to this call.');
  if (call.finalizedAt || ['completed', 'missed', 'declined'].includes(call.status)) {
    throw new ApiError(412, 'call-ended', 'This audio call has ended.');
  }
  if (!call.startedAt && Date.now() > call.expiresAt) {
    await finalizeCall(callId, 'missed');
    throw new ApiError(410, 'call-missed', 'This audio call was missed.');
  }
  const participant = await getCallUser(uid);
  const now = Date.now();
  const otherJoined = Object.entries(call.participants || {}).some(([id, person]) =>
    id !== uid && person.state === 'joined' && !person.leftAt);
  const updates = {
    [`calls/${callId}/participants/${uid}/state`]: 'joined',
    [`calls/${callId}/participants/${uid}/joinedAt`]: now,
    [`calls/${callId}/status`]: otherJoined ? 'active' : call.status,
    [`callInvites/${uid}/${callId}`]: null,
  };
  if (!call.startedAt && otherJoined) updates[`calls/${callId}/startedAt`] = now;
  await primaryDb().ref().update(updates);
  const joinedCall = { ...call, status: otherJoined ? 'active' : call.status, startedAt: call.startedAt || (otherJoined ? now : null) };
  return { call: publicCall(joinedCall), serverUrl: requireLiveKit().url, token: await createParticipantToken(joinedCall, participant) };
};

const declineCall = async (uid, body) => {
  const callId = cleanId(body.callId);
  const snapshot = await primaryDb().ref(`calls/${callId}`).once('value');
  if (!snapshot.exists()) return { success: true };
  const call = snapshot.val();
  if (!call.participants?.[uid]) throw new ApiError(403, 'permission-denied', 'You were not invited to this call.');
  await primaryDb().ref(`calls/${callId}/participants/${uid}`).update({ state: 'declined', leftAt: Date.now() });
  await primaryDb().ref(`callInvites/${uid}/${callId}`).remove();
  if (!call.startedAt && Object.keys(call.participants || {}).length <= 2) await finalizeCall(callId, 'declined');
  return { success: true };
};

const leaveCall = async (uid, body) => {
  const callId = cleanId(body.callId);
  const callRef = primaryDb().ref(`calls/${callId}`);
  const snapshot = await callRef.once('value');
  if (!snapshot.exists()) return { success: true };
  const call = snapshot.val();
  if (!call.participants?.[uid]) throw new ApiError(403, 'permission-denied', 'You are not part of this call.');
  await callRef.child(`participants/${uid}`).update({ state: 'left', leftAt: Date.now() });
  const remaining = Object.entries(call.participants || {}).filter(([id, person]) =>
    id !== uid && person.state === 'joined' && !person.leftAt);
  if (remaining.length < 2) await finalizeCall(callId, call.startedAt ? 'completed' : 'missed');
  return { success: true };
};

const inviteParticipant = async (uid, body) => {
  const callId = cleanId(body.callId);
  const targetId = cleanId(body.targetId, 'targetId');
  const callRef = primaryDb().ref(`calls/${callId}`);
  const snapshot = await callRef.once('value');
  if (!snapshot.exists()) throw new ApiError(404, 'not-found', 'This audio call has ended.');
  const call = { id: callId, ...snapshot.val() };
  if (call.finalizedAt || call.status !== 'active') throw new ApiError(412, 'call-ended', 'This audio call has ended.');
  if (call.participants?.[uid]?.state !== 'joined') throw new ApiError(403, 'permission-denied', 'Join the call before inviting someone.');
  const current = Object.values(call.participants || {}).filter((person) => !['left', 'declined'].includes(person.state));
  if (current.length >= CALL_MAX_PARTICIPANTS) throw new ApiError(409, 'participant-limit', 'This call already has four participants.');
  if (call.participants?.[targetId] && !['left', 'declined'].includes(call.participants[targetId].state)) {
    throw new ApiError(409, 'already-exists', 'This person is already in the call.');
  }
  const [target, inviter] = await Promise.all([assertFriendCanCall(uid, targetId), getCallUser(uid)]);
  const now = Date.now();
  await Promise.all([
    callRef.child(`participants/${targetId}`).set({ ...target, state: 'invited', invitedBy: uid, invitedAt: now }),
    primaryDb().ref(`callInvites/${targetId}/${callId}`).set({
      callId, caller: inviter, chatId: call.chatId, createdAt: now, expiresAt: now + CALL_RING_TIMEOUT_MS,
    }),
  ]);
  sendCallPush(targetId, inviter, callId).catch((error) => console.warn('[AudioCall] Participant push failed:', error.message));
  return { success: true };
};

const setPreference = async (uid, body) => {
  const enabled = body.enabled === true;
  await primaryDb().ref(`users/${uid}/callingEnabled`).set(enabled);
  return { success: true, enabled };
};

const actions = {
  create: createCall,
  join: joinCall,
  decline: declineCall,
  leave: leaveCall,
  invite: inviteParticipant,
  setPreference,
};

const handleAction = async (authorization, body = {}) => {
  const decoded = await verifyUser(authorization);
  const action = String(body.action || '');
  if (!actions[action]) throw new ApiError(400, 'invalid-action', 'This audio call action is invalid.');
  return actions[action](decoded.uid, body);
};

const handleWebhook = async (rawBody, authorization) => {
  const { apiKey, apiSecret } = requireLiveKit();
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  const event = await receiver.receive(rawBody, authorization);
  const roomName = event.room?.name || '';
  if (!roomName.startsWith('call_')) return 'ignored';
  const callId = cleanId(roomName.slice(5));
  if (event.event === 'participant_joined' && event.participant?.identity) {
    const now = Date.now();
    const callRef = primaryDb().ref(`calls/${callId}`);
    const call = (await callRef.once('value')).val() || {};
    const participantId = event.participant.identity;
    const otherJoined = Object.entries(call.participants || {}).some(([id, person]) =>
      id !== participantId && person.state === 'joined' && !person.leftAt);
    const updates = {
      [`calls/${callId}/participants/${participantId}/state`]: 'joined',
      [`calls/${callId}/participants/${participantId}/joinedAt`]: now,
    };
    if (otherJoined) {
      updates[`calls/${callId}/status`] = 'active';
      if (!call.startedAt) updates[`calls/${callId}/startedAt`] = now;
    }
    await primaryDb().ref().update(updates);
  }
  if ((event.event === 'participant_left' || event.event === 'participant_connection_aborted') && event.participant?.identity) {
    const participantId = event.participant.identity;
    const callRef = primaryDb().ref(`calls/${callId}`);
    await callRef.child(`participants/${participantId}`).update({ state: 'left', leftAt: Date.now() });
    const latest = (await callRef.once('value')).val() || {};
    const remaining = Object.values(latest.participants || {}).filter((person) => person.state === 'joined' && !person.leftAt);
    if (!latest.finalizedAt && remaining.length < 2) await finalizeCall(callId, latest.startedAt ? 'completed' : 'missed');
  }
  if (event.event === 'room_finished') await finalizeCall(callId, 'completed');
  return 'ok';
};

module.exports = { ApiError, handleAction, handleWebhook, verifyUser };
