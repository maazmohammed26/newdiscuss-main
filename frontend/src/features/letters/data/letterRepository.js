/**
 * letterRepository.js
 * Canonical repository for Discuss Letters.
 * Bridges local IndexedDB cache with remote Firebase Realtime Database 5.
 * 
 * LOCAL-FIRST CLIENT -> BOUNDED READ MODEL -> OPTIMISTIC OUTBOX -> COMMAND SERVICE -> DB5
 */

import {
  fifthDatabase,
  ref as fifthRef,
  get as fifthGet,
  set as fifthSet,
  update as fifthUpdate,
  query as fifthQuery,
  orderByChild,
  limitToLast,
  onValue as fifthOnValue,
  off as fifthOff,
} from '@/lib/firebaseFifth';
import { getAuthenticatedIdToken } from '@/lib/authenticatedRequest';
import {
  saveLocalThread,
  saveLocalThreads,
  getLocalThreads,
  getFastMemoryThreads,
  getLocalLettersForThread,
  getFastMemoryLettersForThread,
  saveLocalLetter,
  saveLocalLetters,
  reconcileLocalLetter,
  markLocalLetterOpened as markLocalOpenedStore,
  saveLetterDraft,
  getLetterDraft,
  clearLetterDraft,
  saveLocalLetterPreference,
} from './letterLocalStore';
import { getLetterThreadId } from '../utils/threadIdentity';
import { validateLetterBody } from '../utils/graphemeCounter';

export { getLetterThreadId };

/**
 * Feature kill switch check. Defaults to true unless explicitly disabled.
 */
export const isLettersEnabled = () => {
  if (typeof window !== 'undefined' && window.__DISCUSS_DISABLE_LETTERS === true) return false;
  return process.env.REACT_APP_LETTERS_ENABLED !== 'false';
};

/**
 * Returns threads from local cache first, then triggers bounded sync with DB5.
 * @param {string} currentUserId 
 * @param {'friends'|'non-friends'|null} relationBucket 
 * @param {function} onUpdate Callback when fresh remote delta arrives
 * @returns {Promise<Array>}
 */
export const getLetterThreads = async (currentUserId, relationBucket = null, onUpdate = null) => {
  if (!currentUserId) return [];

  // 1. Instant local read
  const cached = await getLocalThreads(relationBucket);

  // 2. Background delta-sync from Database 5
  if (fifthDatabase) {
    syncUserLetterThreads(currentUserId, relationBucket, onUpdate).catch((err) => {
      console.warn('[LettersRepo] Thread sync warning:', err?.message);
    });
  }

  return cached;
};

/**
 * Synchronizes user's thread index from Database 5 (bounded to latest 40 threads)
 */
export const syncUserLetterThreads = async (currentUserId, relationBucket = null, onUpdate = null) => {
  if (!fifthDatabase || !currentUserId) return;

  try {
    const userThreadsRef = fifthRef(fifthDatabase, `userLetterThreads/${currentUserId}`);
    let snapshot;
    try {
      const q = fifthQuery(userThreadsRef, orderByChild('lastActivityAt'), limitToLast(40));
      snapshot = await fifthGet(q);
    } catch (queryErr) {
      // If server index is not yet indexed in RTDB rules, fall back to direct ref read
      snapshot = await fifthGet(userThreadsRef);
    }

    if (!snapshot.exists()) return;

    const threadsData = snapshot.val();
    const threadsList = Object.entries(threadsData).map(([threadId, data]) => ({
      threadId,
      counterpartUid: data.counterpartUid,
      lastLetterId: data.lastLetterId,
      lastActivityAt: data.lastActivityAt,
      unreadCount: data.unreadCount || 0,
      relationBucket: data.relationBucket || 'friends',
      lastDirection: data.lastDirection || 'incoming',
      lastSnippet: data.lastSnippet || '',
      originCityLabel: data.originCityLabel || null,
      destinationCityLabel: data.destinationCityLabel || null,
    }));

    // Sort descending by lastActivityAt locally
    threadsList.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));

    await saveLocalThreads(threadsList);

    if (typeof onUpdate === 'function') {
      const fresh = await getLocalThreads(relationBucket);
      onUpdate(fresh);
    }
  } catch (err) {
    console.warn('[LettersRepo] Bounded sync notice:', err?.message);
  }
};

/**
 * Subscribes to realtime updates for recent user thread index.
 */
export const subscribeToLetterThreads = (currentUserId, onUpdate) => {
  if (!fifthDatabase || !currentUserId) return () => {};

  const userThreadsRef = fifthRef(fifthDatabase, `userLetterThreads/${currentUserId}`);
  let targetQuery;
  try {
    targetQuery = fifthQuery(userThreadsRef, orderByChild('lastActivityAt'), limitToLast(30));
  } catch (_) {
    targetQuery = userThreadsRef;
  }

  const listener = async (snapshot) => {
    if (!snapshot.exists()) return;
    const threadsData = snapshot.val();
    const threadsList = Object.entries(threadsData).map(([threadId, data]) => ({
      threadId,
      ...data,
    }));
    await saveLocalThreads(threadsList);
    if (typeof onUpdate === 'function') {
      const allThreads = await getLocalThreads();
      onUpdate(allThreads);
    }
  };

  fifthOnValue(targetQuery, listener, (err) => {
    if (err?.message && err.message.includes('Index not defined')) {
      fifthOnValue(userThreadsRef, listener, () => {});
    } else {
      console.warn('[LettersRepo] Threads listener notice:', err?.message);
    }
  });

  return () => {
    fifthOff(targetQuery, 'value', listener);
    fifthOff(userThreadsRef, 'value', listener);
  };
};

/**
 * Returns latest letters for a thread (bounded window, default 3 latest for physical stack)
 */
export const getThreadLetters = async (threadId, limit = 20) => {
  if (!threadId) return [];
  return await getLocalLettersForThread(threadId, limit);
};

/**
 * Subscribes to head of an active letter thread in Database 5
 */
export const subscribeToThreadHead = (threadId, onUpdate) => {
  if (!fifthDatabase || !threadId) return () => {};

  const lettersRef = fifthRef(fifthDatabase, `letterThreads/${threadId}/letters`);
  let q;
  try {
    q = fifthQuery(lettersRef, orderByChild('createdAt'), limitToLast(10));
  } catch (_) {
    q = lettersRef;
  }

  const listener = async (snapshot) => {
    if (!snapshot.exists()) return;
    const raw = snapshot.val();
    const list = Object.entries(raw).map(([id, val]) => ({
      id,
      threadId,
      ...val,
    }));
    await saveLocalLetters(list);
    if (typeof onUpdate === 'function') {
      const letters = await getLocalLettersForThread(threadId, 20);
      onUpdate(letters);
    }
  };

  fifthOnValue(q, listener, (err) => {
    if (err?.message && err.message.includes('Index not defined')) {
      fifthOnValue(lettersRef, listener, () => {});
    } else {
      console.warn('[LettersRepo] Thread letters listener notice:', err?.message);
    }
  });

  return () => {
    fifthOff(q, 'value', listener);
    fifthOff(lettersRef, 'value', listener);
  };
};

/**
 * Loads older historical letters for on-demand pagination.
 */
export const fetchEarlierLetters = async (threadId, beforeCreatedAt, limit = 10) => {
  if (!fifthDatabase || !threadId || !beforeCreatedAt) return [];

  try {
    const lettersRef = fifthRef(fifthDatabase, `letterThreads/${threadId}/letters`);
    let snap;
    try {
      const q = fifthQuery(lettersRef, orderByChild('createdAt'), limitToLast(limit * 2));
      snap = await fifthGet(q);
    } catch (_) {
      snap = await fifthGet(lettersRef);
    }
    if (!snap.exists()) return [];

    const beforeTime = new Date(beforeCreatedAt).getTime();
    const items = Object.entries(snap.val())
      .map(([id, val]) => ({ id, threadId, ...val }))
      .filter((item) => new Date(item.createdAt).getTime() < beforeTime)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-limit);

    await saveLocalLetters(items);
    return items;
  } catch (err) {
    console.warn('[LettersRepo] Earlier letters fetch notice:', err?.message);
    return [];
  }
};

/**
 * Command: Sends a Letter via optimistic local mutation + server endpoint.
 */
export const sendLetterCommand = async ({
  senderUid,
  recipientUid,
  body,
  originCityId = null,
  originCityLabel = null,
  destinationCityId = null,
  destinationCityLabel = null,
  rememberCity = false,
}) => {
  const validation = validateLetterBody(body);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const clientMutationId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const threadId = getLetterThreadId(senderUid, recipientUid);
  const nowIso = new Date().toISOString();
  const tempLetterId = `opt_${clientMutationId}`;

  // 1. Construct optimistic local letter
  const optimisticLetter = {
    id: tempLetterId,
    threadId,
    senderId: senderUid,
    recipientId: recipientUid,
    body: body.trim(),
    createdAt: nowIso,
    originCityId,
    originCityLabel,
    destinationCityId,
    destinationCityLabel,
    clientMutationId,
    status: 'QUEUED',
    schemaVersion: 1,
  };

  // 2. Optimistic local save
  await saveLocalLetter(optimisticLetter);
  await saveLocalThread({
    threadId,
    counterpartUid: recipientUid,
    lastLetterId: tempLetterId,
    lastActivityAt: nowIso,
    unreadCount: 0,
    relationBucket: 'friends', // Reconciled on server response
    lastDirection: 'outgoing',
    lastSnippet: body.slice(0, 100),
    originCityLabel,
    destinationCityLabel,
  });

  // Clear local draft for this sender + recipient pair
  await clearLetterDraft(senderUid, recipientUid);

  // 3. Dispatch to server send endpoint
  try {
    const idToken = await getAuthenticatedIdToken();
    const response = await fetch('/api/letters', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        'X-Discuss-Client-Mutation-Id': clientMutationId,
      },
      body: JSON.stringify({
        action: 'send',
        recipientUid,
        body: body.trim(),
        originCityId,
        originCityLabel,
        rememberCity,
        clientMutationId,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      const errCode = result.code || `http-${response.status}`;
      const errMsg = result.error || 'Could not send letter.';

      // Update optimistic letter to FAILED
      optimisticLetter.status = 'FAILED';
      await saveLocalLetter(optimisticLetter);

      const err = new Error(errMsg);
      err.code = errCode;
      throw err;
    }

    // 4. Server commit reconciliation
    const canonicalLetter = {
      ...result.letter,
      id: result.letter.letterId || result.letter.id,
      threadId,
      status: 'SENT',
    };

    await reconcileLocalLetter(canonicalLetter);
    await saveLocalThread({
      threadId,
      counterpartUid: recipientUid,
      lastLetterId: canonicalLetter.id,
      lastActivityAt: canonicalLetter.createdAt,
      unreadCount: 0,
      relationBucket: result.relationBucket || 'friends',
      lastDirection: 'outgoing',
      lastSnippet: canonicalLetter.body.slice(0, 100),
      originCityLabel: canonicalLetter.originCityLabel,
      destinationCityLabel: canonicalLetter.destinationCityLabel,
    });

    return canonicalLetter;
  } catch (error) {
    console.warn('[LettersRepo] Send command failed/deferred:', error.message);
    if (!navigator.onLine) {
      // Offline fallback: retains QUEUED status
      optimisticLetter.status = 'QUEUED';
      await saveLocalLetter(optimisticLetter);
    }
    throw error;
  }
};

/**
 * Records opened receipt for a letter
 */
export const markLetterOpened = async (letterId, threadId, recipientUid) => {
  if (!letterId) return;
  const openedAt = new Date().toISOString();
  await markLocalOpenedStore(letterId, openedAt);

  try {
    const idToken = await getAuthenticatedIdToken();
    await fetch('/api/letters', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ action: 'open', letterId, threadId }),
    }).catch(() => {});
  } catch (_) {}
};

export const updateLetterPolicy = async (uid, whoCanSend) => {
  if (!fifthDatabase || !uid) return;
  const policyRef = fifthRef(fifthDatabase, `letterPolicies/${uid}`);
  await fifthSet(policyRef, { whoCanSend, updatedAt: new Date().toISOString() });
};

export const getLetterPolicy = async (uid) => {
  if (!fifthDatabase || !uid) return { whoCanSend: 'everyone' };
  try {
    const snap = await fifthGet(fifthRef(fifthDatabase, `letterPolicies/${uid}`));
    return snap.exists() ? snap.val() : { whoCanSend: 'everyone' };
  } catch (_) {
    return { whoCanSend: 'everyone' };
  }
};

export const updateRemoteLetterPreference = async (uid, pref) => {
  if (!fifthDatabase || !uid) return;
  const prefRef = fifthRef(fifthDatabase, `letterPreferences/${uid}`);
  await fifthUpdate(prefRef, { ...pref, updatedAt: new Date().toISOString() });
  await saveLocalLetterPreference(uid, pref);
};

export const getRemoteLetterPreference = async (uid) => {
  if (!fifthDatabase || !uid) return null;
  try {
    const snap = await fifthGet(fifthRef(fifthDatabase, `letterPreferences/${uid}`));
    return snap.exists() ? snap.val() : null;
  } catch (_) {
    return null;
  }
};

export {
  getFastMemoryThreads,
  getFastMemoryLettersForThread,
  saveLetterDraft,
  getLetterDraft,
  clearLetterDraft,
};
