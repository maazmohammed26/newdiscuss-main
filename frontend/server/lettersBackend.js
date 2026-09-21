'use strict';

/**
 * lettersBackend.js
 * Server-side business logic and Database 5 integration for Discuss Letters.
 * Enforces authenticated sender UID, recipient validation, abuse controls,
 * 150-grapheme limits, atomic DB5 persistence, and decoupled notification fanout.
 */

const crypto = require('crypto');
const { ApiError, verifyUser, primaryDb } = require('./audioCallBackend');
const { sendPushNotification } = require('./serverPushService');
const { getLetterThreadId } = require('../src/features/letters/utils/threadIdentity');

const DB5_DATABASE_URL = process.env.SIGNALS_DATABASE_URL
  || process.env.REACT_APP_FIREBASE_FIFTH_DATABASE_URL
  || 'https://discuss-d48be-default-rtdb.firebaseio.com';

const SECONDARY_DATABASE_URL = process.env.SECONDARY_DATABASE_URL
  || 'https://discussit-5879b-default-rtdb.firebaseio.com';

const cleanText = (value, max = 240) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .trim()
  .slice(0, max);

const cleanId = (value) => {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{4,160}$/.test(id) ? id : '';
};

// Grapheme cluster counter for Node
let segmenter = null;
try {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
} catch (_) {}

const countGraphemes = (text) => {
  if (!text) return 0;
  const str = String(text);
  if (segmenter) {
    let count = 0;
    // eslint-disable-next-line no-unused-vars
    for (const _ of segmenter.segment(str)) {
      count += 1;
    }
    return count;
  }
  return Array.from(str).length;
};

const auxiliaryRequest = async (baseUrl, path, method = 'GET', body) => {
  const safePath = String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const url = safePath ? `${baseUrl.replace(/\/$/, '')}/${safePath}.json` : `${baseUrl.replace(/\/$/, '')}/.json`;
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Auxiliary DB request failed (${response.status}): ${errText}`);
  }
  return response.json().catch(() => null);
};

/**
 * Executes send letter command on the server.
 */
const sendLetterServer = async ({
  actorUid,
  recipientUid,
  body,
  originCityId,
  originCityLabel,
  rememberCity,
  clientMutationId,
}) => {
  if (!actorUid) throw new ApiError(401, 'unauthenticated', 'You must be signed in.');
  const cleanRecipientId = cleanId(recipientUid);
  if (!cleanRecipientId) throw new ApiError(400, 'invalid-recipient', 'Invalid recipient identifier.');

  // 1. Reject self-send
  if (actorUid === cleanRecipientId) {
    throw new ApiError(400, 'self-send-prohibited', 'You cannot send a Letter to yourself.');
  }

  // 2. Validate body length (1 to 150 graphemes)
  const trimmedBody = String(body || '').trim();
  if (!trimmedBody) {
    throw new ApiError(400, 'empty-body', 'Letter body cannot be empty.');
  }
  const graphemeLen = countGraphemes(body);
  if (graphemeLen > 150) {
    throw new ApiError(400, 'body-too-long', `Letter exceeds maximum 150 graphemes (found ${graphemeLen}).`);
  }

  const cleanMutationId = cleanId(clientMutationId) || crypto.randomUUID();
  const threadId = getLetterThreadId(actorUid, cleanRecipientId);

  // 3. Idempotency check: if mutationId already committed by this sender, return it immediately
  try {
    const existingMutation = await auxiliaryRequest(
      DB5_DATABASE_URL,
      `letterMutationIds/${actorUid}/${cleanMutationId}`
    );
    if (existingMutation && existingMutation.letterId) {
      const existingLetter = await auxiliaryRequest(
        DB5_DATABASE_URL,
        `letterThreads/${threadId}/letters/${existingMutation.letterId}`
      );
      if (existingLetter) {
        return {
          ok: true,
          letter: { id: existingMutation.letterId, ...existingLetter },
          idempotent: true,
        };
      }
    }
  } catch (_) {}

  // 4. Fetch sender, recipient profiles and check blocks
  const [actorProfileSnap, recipientProfileSnap] = await Promise.all([
    primaryDb().ref(`users/${actorUid}`).once('value'),
    primaryDb().ref(`users/${cleanRecipientId}`).once('value'),
  ]);

  if (!recipientProfileSnap.exists()) {
    throw new ApiError(404, 'recipient-not-found', 'This Discuss member does not exist or has been removed.');
  }
  const actorProfile = actorProfileSnap.val() || {};
  const recipientProfile = recipientProfileSnap.val() || {};

  // Check blocks in Secondary DB
  const [recipientBlockSnap, senderBlockSnap] = await Promise.all([
    auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${cleanRecipientId}/blocked/${actorUid}`).catch(() => null),
    auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${actorUid}/blocked/${cleanRecipientId}`).catch(() => null),
  ]);
  if (recipientBlockSnap || senderBlockSnap) {
    throw new ApiError(403, 'user-unavailable', 'This member is unavailable.');
  }

  // 5. Check Letter Privacy Policy in DB5
  const recipientPolicy = await auxiliaryRequest(
    DB5_DATABASE_URL,
    `letterPolicies/${cleanRecipientId}`
  ).catch(() => ({}));
  const whoCanSend = recipientPolicy?.whoCanSend || 'everyone';

  if (whoCanSend === 'nobody') {
    throw new ApiError(403, 'privacy-nobody', 'This member is not accepting Letters.');
  }

  // 6. Check Friendship relationship in Secondary DB
  const friendSnap = await auxiliaryRequest(
    SECONDARY_DATABASE_URL,
    `relationships/${actorUid}/friends/${cleanRecipientId}`
  ).catch(() => null);

  const isFriend = Boolean(friendSnap && (friendSnap.status === 'active' || friendSnap.status === 'friends'));
  const relationBucket = isFriend ? 'friends' : 'non-friends';

  if (whoCanSend === 'friends' && !isFriend) {
    throw new ApiError(403, 'privacy-friends-only', 'This member only accepts Letters from friends.');
  }

  // 7. Non-friend safety: check for existing unopened letter
  if (!isFriend) {
    const pendingSnap = await auxiliaryRequest(
      DB5_DATABASE_URL,
      `letterPendingNonFriend/${cleanRecipientId}/${actorUid}`
    ).catch(() => null);

    if (pendingSnap && pendingSnap.letterId) {
      throw new ApiError(
        429,
        'pending-unopened-letter',
        "You've already sent a Letter. Wait for them to open it before sending another."
      );
    }
  }

  // 8. Origin and Destination city handling
  const cleanOriginLabel = cleanText(originCityLabel, 48);
  const cleanOriginId = cleanId(originCityId);

  // Recipient city: derived ONLY from recipient's own public preference in letterPreferences
  const recipientPref = await auxiliaryRequest(
    DB5_DATABASE_URL,
    `letterPreferences/${cleanRecipientId}`
  ).catch(() => ({}));

  let cleanDestLabel = null;
  let cleanDestId = null;
  if (recipientPref?.cityVisibility === 'public' && recipientPref.cityLabel) {
    cleanDestLabel = cleanText(recipientPref.cityLabel, 48);
    cleanDestId = cleanId(recipientPref.cityId);
  }

  // 9. Read existing unreadCount for recipient on this thread to accurately increment
  const recipientThreadSnap = await auxiliaryRequest(
    DB5_DATABASE_URL,
    `userLetterThreads/${cleanRecipientId}/${threadId}`
  ).catch(() => null);
  const currentUnread = Number(recipientThreadSnap?.unreadCount) || 0;

  // 10. Atomic Multi-Path Persistence in Database 5
  const letterId = `ltr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const nowIso = new Date().toISOString();

  const letterRecord = {
    senderId: actorUid,
    recipientId: cleanRecipientId,
    body: trimmedBody,
    createdAt: nowIso,
    relationAtSend: relationBucket,
    originCityId: cleanOriginId || null,
    originCityLabel: cleanOriginLabel || null,
    destinationCityId: cleanDestId || null,
    destinationCityLabel: cleanDestLabel || null,
    clientMutationId: cleanMutationId,
    schemaVersion: 1,
  };

  const atomicUpdates = {
    [`letterThreads/${threadId}/letters/${letterId}`]: letterRecord,
    [`letterThreads/${threadId}/meta/lastActivityAt`]: nowIso,
    [`letterThreads/${threadId}/meta/lastLetterId`]: letterId,
    [`letterThreads/${threadId}/meta/participantA`]: [actorUid, cleanRecipientId].sort()[0],
    [`letterThreads/${threadId}/meta/participantB`]: [actorUid, cleanRecipientId].sort()[1],
    [`userLetterThreads/${actorUid}/${threadId}`]: {
      counterpartUid: cleanRecipientId,
      lastLetterId: letterId,
      lastActivityAt: nowIso,
      unreadCount: 0,
      relationBucket,
      lastDirection: 'outgoing',
      lastSnippet: trimmedBody.slice(0, 80),
      originCityLabel: cleanOriginLabel || null,
      destinationCityLabel: cleanDestLabel || null,
    },
    [`userLetterThreads/${cleanRecipientId}/${threadId}`]: {
      counterpartUid: actorUid,
      lastLetterId: letterId,
      lastActivityAt: nowIso,
      unreadCount: currentUnread + 1,
      relationBucket,
      lastDirection: 'incoming',
      lastSnippet: trimmedBody.slice(0, 80),
      originCityLabel: cleanOriginLabel || null,
      destinationCityLabel: cleanDestLabel || null,
    },
    [`letterMutationIds/${actorUid}/${cleanMutationId}`]: {
      letterId,
      createdAt: nowIso,
    },
  };

  if (!isFriend) {
    atomicUpdates[`letterPendingNonFriend/${cleanRecipientId}/${actorUid}`] = {
      letterId,
      createdAt: nowIso,
    };
  }

  // Update sender's remembered city preference in DB5 if requested
  if (rememberCity && cleanOriginLabel) {
    atomicUpdates[`letterPreferences/${actorUid}/cityLabel`] = cleanOriginLabel;
    if (cleanOriginId) atomicUpdates[`letterPreferences/${actorUid}/cityId`] = cleanOriginId;
    atomicUpdates[`letterPreferences/${actorUid}/cityVisibility`] = 'public';
  }

  // Execute atomic multi-path update in DB5
  await auxiliaryRequest(DB5_DATABASE_URL, '', 'PATCH', atomicUpdates);

  // 11. Canonical Notification Fanout
  const eventId = crypto.randomUUID();
  const actorName = cleanText(actorProfile.username || actorProfile.displayName || 'Someone', 40);
  const notifTitle = 'New Letter';
  const notifBody = `@${actorName} sent you a Letter.`;
  const notifUrl = `/chat?tab=letters&thread=${threadId}`;

  // 11a. Primary DB in-app notification
  try {
    await primaryDb().ref(`notifications/${cleanRecipientId}/${eventId}`).set({
      id: eventId,
      type: 'letter_received',
      actorId: actorUid,
      entityId: letterId,
      title: notifTitle,
      body: notifBody,
      url: notifUrl,
      read: false,
      createdAt: nowIso,
    });
  } catch (notifErr) {
    console.warn('[LettersBackend] In-app notification write warning:', notifErr.message);
  }

  // 11b. OneSignal Push Notification (Push failure NEVER fails the Letter)
  sendPushNotification({
    recipientUids: [cleanRecipientId],
    title: notifTitle,
    body: notifBody,
    url: notifUrl,
    eventId,
    additionalData: { type: 'letter_received', threadId, letterId },
    recipientProfiles: { [cleanRecipientId]: recipientProfile },
  }).catch((pushErr) => {
    console.warn('[LettersBackend] Push fanout warning:', pushErr.message);
  });

  return {
    ok: true,
    letter: { id: letterId, ...letterRecord },
    relationBucket,
    threadId,
  };
};

/**
 * Marks a letter as opened by the recipient in Database 5.
 * Strictly IDEMPOTENT: Opening repeatedly never decrements unreadCount below 0
 * or duplicates operations.
 */
const markLetterOpenedServer = async ({ actorUid, letterId, threadId }) => {
  if (!actorUid || !letterId) throw new ApiError(400, 'invalid-arguments', 'Missing required identifiers.');

  const letterPath = threadId
    ? `letterThreads/${threadId}/letters/${letterId}`
    : null;

  if (!letterPath) throw new ApiError(400, 'missing-thread-id', 'Thread identifier is required.');

  const letter = await auxiliaryRequest(DB5_DATABASE_URL, letterPath).catch(() => null);
  if (!letter) throw new ApiError(404, 'letter-not-found', 'Letter record does not exist.');

  // Only the actual recipient can mark opened
  if (letter.recipientId !== actorUid) {
    throw new ApiError(403, 'forbidden', 'Only the recipient may mark a Letter opened.');
  }

  // IDEMPOTENCY: If already opened, return existing openedAt without changing counts
  if (letter.openedAt) {
    return { ok: true, alreadyOpened: true, openedAt: letter.openedAt };
  }

  const nowIso = new Date().toISOString();
  const senderUid = letter.senderId;

  // Read current unreadCount to decrement cleanly
  const recipientThreadSnap = await auxiliaryRequest(
    DB5_DATABASE_URL,
    `userLetterThreads/${actorUid}/${threadId}`
  ).catch(() => null);
  const currentUnread = Number(recipientThreadSnap?.unreadCount) || 1;
  const newUnread = Math.max(0, currentUnread - 1);

  const updates = {
    [`${letterPath}/openedAt`]: nowIso,
    [`${letterPath}/status`]: 'OPENED',
    [`letterReceipts/${threadId}/${letterId}`]: {
      openedAt: nowIso,
      recipientUid: actorUid,
    },
    [`userLetterThreads/${actorUid}/${threadId}/unreadCount`]: newUnread,
  };

  // Clear non-friend pending limitation once opened so sender can send again
  if (senderUid) {
    updates[`letterPendingNonFriend/${actorUid}/${senderUid}`] = null;
  }

  await auxiliaryRequest(DB5_DATABASE_URL, '', 'PATCH', updates);
  return { ok: true, openedAt: nowIso, alreadyOpened: false };
};

module.exports = {
  sendLetterServer,
  markLetterOpenedServer,
  getThreadId: getLetterThreadId,
  countGraphemes,
  DB5_DATABASE_URL,
};
