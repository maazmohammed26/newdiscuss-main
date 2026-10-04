/**
 * letterLocalStore.js
 * Local IndexedDB + in-memory store for Discuss Letters.
 * Backed by discuss_cache (v9) with zero-latency synchronous in-memory read path.
 */

import { getLocalDatabase } from '@/data/db/localDatabase';

// In-memory working set for instant paints
const threadCache = new Map(); // threadId -> thread
const letterCache = new Map(); // letterId -> letter
const threadLettersIndex = new Map(); // threadId -> Set<letterId>
const draftCache = new Map(); // recipientUid -> draft

/**
 * Normalizes a letter record
 */
export const normalizeLetter = (data) => {
  if (!data) return null;
  return {
    id: String(data.id || data.letterId),
    threadId: String(data.threadId),
    senderId: String(data.senderId),
    recipientId: String(data.recipientId),
    body: String(data.body || ''),
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    relationAtSend: data.relationAtSend || 'non-friend',
    originCityId: data.originCityId || null,
    originCityLabel: data.originCityLabel || null,
    destinationCityId: data.destinationCityId || null,
    destinationCityLabel: data.destinationCityLabel || null,
    clientMutationId: data.clientMutationId || null,
    status: data.status || 'SENT', // QUEUED, SENT, OPENED, FAILED
    openedAt: data.openedAt || null,
    schemaVersion: Number(data.schemaVersion) || 1,
  };
};

/**
 * Normalizes a letter thread record
 */
export const normalizeThread = (data) => {
  if (!data) return null;
  return {
    threadId: String(data.threadId),
    counterpartUid: String(data.counterpartUid),
    lastLetterId: data.lastLetterId || null,
    lastActivityAt: data.lastActivityAt ? new Date(data.lastActivityAt).toISOString() : new Date().toISOString(),
    unreadCount: Number(data.unreadCount) || 0,
    relationBucket: data.relationBucket || 'friends', // 'friends' | 'non-friends'
    lastDirection: data.lastDirection || 'incoming', // 'incoming' | 'outgoing'
    lastSnippet: String(data.lastSnippet || '').slice(0, 100),
    originCityLabel: data.originCityLabel || null,
    destinationCityLabel: data.destinationCityLabel || null,
  };
};

// ── THREADS ──────────────────────────────────────────────────────────────

export const saveLocalThread = async (thread) => {
  const normalized = normalizeThread(thread);
  if (!normalized) return;
  threadCache.set(normalized.threadId, normalized);

  try {
    const db = await getLocalDatabase();
    await db.put('letter_threads', normalized);
  } catch (error) {
    console.warn('[LettersLocal] Failed to persist thread:', error.message);
  }
};

export const saveLocalThreads = async (threads) => {
  if (!Array.isArray(threads) || !threads.length) return;
  const normalizedList = threads.map(normalizeThread).filter(Boolean);
  normalizedList.forEach((t) => threadCache.set(t.threadId, t));

  try {
    const db = await getLocalDatabase();
    const tx = db.transaction('letter_threads', 'readwrite');
    for (const t of normalizedList) {
      await tx.store.put(t);
    }
    await tx.done;
  } catch (error) {
    console.warn('[LettersLocal] Failed to persist threads bulk:', error.message);
  }
};

export const getLocalThreads = async (relationBucket = null) => {
  let threads = [];
  try {
    const db = await getLocalDatabase();
    if (relationBucket) {
      threads = await db.getAllFromIndex('letter_threads', 'relationBucket', relationBucket);
    } else {
      threads = await db.getAll('letter_threads');
    }
  } catch (error) {
    console.warn('[LettersLocal] Failed to read threads from IndexedDB, using memory:', error.message);
    threads = Array.from(threadCache.values());
    if (relationBucket) {
      threads = threads.filter((t) => t.relationBucket === relationBucket);
    }
  }

  // Populate memory cache
  threads.forEach((t) => threadCache.set(t.threadId, t));

  // Sort by lastActivityAt descending
  return threads.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
};

export const getFastMemoryThreads = (relationBucket = null) => {
  const list = Array.from(threadCache.values());
  const filtered = relationBucket ? list.filter((t) => t.relationBucket === relationBucket) : list;
  return filtered.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
};

export const getLocalThread = async (threadId) => {
  if (threadCache.has(threadId)) return threadCache.get(threadId);
  try {
    const db = await getLocalDatabase();
    const thread = await db.get('letter_threads', threadId);
    if (thread) threadCache.set(threadId, thread);
    return thread || null;
  } catch (_) {
    return null;
  }
};

// ── LETTERS ──────────────────────────────────────────────────────────────

export const saveLocalLetter = async (letter) => {
  const normalized = normalizeLetter(letter);
  if (!normalized) return;
  letterCache.set(normalized.id, normalized);

  if (!threadLettersIndex.has(normalized.threadId)) {
    threadLettersIndex.set(normalized.threadId, new Set());
  }
  threadLettersIndex.get(normalized.threadId).add(normalized.id);

  try {
    const db = await getLocalDatabase();
    await db.put('letters', normalized);
  } catch (error) {
    console.warn('[LettersLocal] Failed to persist letter:', error.message);
  }
};

export const reconcileLocalLetter = async (canonicalLetter) => {
  const normalized = normalizeLetter(canonicalLetter);
  if (!normalized) return null;

  const mutationId = normalized.clientMutationId;
  const canonicalId = normalized.id;
  const threadId = normalized.threadId;

  let oldOptId = null;

  // 1. Identify existing optimistic key in working set
  if (mutationId) {
    const directOptId = `opt_${mutationId}`;
    if (letterCache.has(directOptId) && directOptId !== canonicalId) {
      oldOptId = directOptId;
    } else {
      for (const [id, item] of letterCache.entries()) {
        if (item.clientMutationId === mutationId && id !== canonicalId) {
          oldOptId = id;
          break;
        }
      }
    }
  }

  // 2. Remove obsolete optimistic record from memory cache
  if (oldOptId) {
    letterCache.delete(oldOptId);
    if (threadLettersIndex.has(threadId)) {
      threadLettersIndex.get(threadId).delete(oldOptId);
    }
  }

  // 3. Put canonical record in memory
  letterCache.set(canonicalId, normalized);
  if (!threadLettersIndex.has(threadId)) {
    threadLettersIndex.set(threadId, new Set());
  }
  threadLettersIndex.get(threadId).add(canonicalId);

  // 4. Atomically migrate in IndexedDB
  try {
    const db = await getLocalDatabase();
    const tx = db.transaction(['letters', 'letter_threads'], 'readwrite');
    const lettersStore = tx.objectStore('letters');

    if (oldOptId) {
      await lettersStore.delete(oldOptId);
    } else if (mutationId) {
      // Check for direct opt_ key in store as well
      const optRecord = await lettersStore.get(`opt_${mutationId}`);
      if (optRecord) {
        await lettersStore.delete(`opt_${mutationId}`);
      }
    }

    await lettersStore.put(normalized);

    // Update thread's lastLetterId if it pointed to the optimistic key
    const threadsStore = tx.objectStore('letter_threads');
    const existingThread = await threadsStore.get(threadId);
    if (existingThread) {
      if (
        existingThread.lastLetterId === oldOptId ||
        !existingThread.lastLetterId ||
        existingThread.lastLetterId.startsWith('opt_')
      ) {
        existingThread.lastLetterId = canonicalId;
        existingThread.lastActivityAt = normalized.createdAt;
        await threadsStore.put(existingThread);
        threadCache.set(threadId, existingThread);
      }
    }

    await tx.done;
  } catch (error) {
    console.warn('[LettersLocal] Failed to reconcile letter in IndexedDB:', error.message);
  }

  return normalized;
};

export const saveLocalLetters = async (letters) => {
  if (!Array.isArray(letters) || !letters.length) return;
  const normalizedList = letters.map(normalizeLetter).filter(Boolean);

  for (const l of normalizedList) {
    if (l.clientMutationId && !l.id.startsWith('opt_')) {
      await reconcileLocalLetter(l);
    } else {
      await saveLocalLetter(l);
    }
  }
};

export const getLocalLettersForThread = async (threadId, limit = 20) => {
  let rows = [];
  try {
    const db = await getLocalDatabase();
    rows = await db.getAllFromIndex('letters', 'threadId', threadId);
  } catch (error) {
    console.warn('[LettersLocal] Failed to read letters from IndexedDB:', error.message);
    const ids = threadLettersIndex.get(threadId);
    if (ids) {
      rows = Array.from(ids).map((id) => letterCache.get(id)).filter(Boolean);
    }
  }

  // Deduplicate by clientMutationId defensively:
  // If both a canonical letter and its optimistic counterpart exist, keep only canonical
  const canonicalMutations = new Set();
  rows.forEach((l) => {
    if (l.clientMutationId && !l.id.startsWith('opt_')) {
      canonicalMutations.add(l.clientMutationId);
    }
  });

  const deduplicated = [];
  const orphanIdsToDelete = [];
  const seenKeys = new Set();

  for (const l of rows) {
    if (l.id.startsWith('opt_') && l.clientMutationId && canonicalMutations.has(l.clientMutationId)) {
      orphanIdsToDelete.push(l.id);
      continue;
    }
    const dedupKey = l.clientMutationId || l.id;
    if (seenKeys.has(dedupKey)) {
      if (l.id.startsWith('opt_')) orphanIdsToDelete.push(l.id);
      continue;
    }
    seenKeys.add(dedupKey);
    deduplicated.push(l);
  }

  // Purge any identified orphan optimistic records asynchronously
  if (orphanIdsToDelete.length > 0) {
    (async () => {
      try {
        const db = await getLocalDatabase();
        const tx = db.transaction('letters', 'readwrite');
        for (const id of orphanIdsToDelete) {
          letterCache.delete(id);
          threadLettersIndex.get(threadId)?.delete(id);
          await tx.store.delete(id);
        }
        await tx.done;
      } catch (_) {}
    })();
  }

  // Populate memory cache with clean deduplicated set
  deduplicated.forEach((l) => {
    letterCache.set(l.id, l);
    if (!threadLettersIndex.has(l.threadId)) {
      threadLettersIndex.set(l.threadId, new Set());
    }
    threadLettersIndex.get(l.threadId).add(l.id);
  });

  // Sort ascending by createdAt
  deduplicated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return deduplicated.slice(-limit);
};

export const getFastMemoryLettersForThread = (threadId, limit = 20) => {
  const ids = threadLettersIndex.get(threadId);
  if (!ids || ids.size === 0) return [];
  const list = Array.from(ids).map((id) => letterCache.get(id)).filter(Boolean);

  // Defensively deduplicate memory set
  const canonicalMutations = new Set();
  list.forEach((l) => {
    if (l.clientMutationId && !l.id.startsWith('opt_')) {
      canonicalMutations.add(l.clientMutationId);
    }
  });

  const deduplicated = [];
  const seenKeys = new Set();
  for (const l of list) {
    if (l.id.startsWith('opt_') && l.clientMutationId && canonicalMutations.has(l.clientMutationId)) {
      continue;
    }
    const key = l.clientMutationId || l.id;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduplicated.push(l);
  }

  deduplicated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return deduplicated.slice(-limit);
};

export const markLocalLetterOpened = async (letterId, openedAt = new Date().toISOString()) => {
  const letter = letterCache.get(letterId);
  if (letter) {
    letter.status = 'OPENED';
    letter.openedAt = openedAt;
  }
  try {
    const db = await getLocalDatabase();
    const existing = await db.get('letters', letterId);
    if (existing) {
      existing.status = 'OPENED';
      existing.openedAt = openedAt;
      await db.put('letters', existing);
      letterCache.set(letterId, existing);
    }
  } catch (error) {
    console.warn('[LettersLocal] Failed to update opened state:', error.message);
  }
};

// ── DRAFTS (Composite key: senderUid:recipientUid) ───────────────────────

export const makeDraftKey = (senderUid, recipientUid) => {
  return `${String(senderUid || '')}:${String(recipientUid || '')}`;
};

export const saveLetterDraft = async (senderUid, recipientUid, draftData) => {
  if (!senderUid || !recipientUid) return;
  const draftKey = makeDraftKey(senderUid, recipientUid);
  const draft = {
    draftKey,
    senderUid: String(senderUid),
    recipientUid: String(recipientUid),
    body: String(draftData.body || ''),
    originCityId: draftData.originCityId || null,
    originCityLabel: draftData.originCityLabel || null,
    rememberCity: Boolean(draftData.rememberCity),
    updatedAt: new Date().toISOString(),
  };
  draftCache.set(draftKey, draft);

  try {
    const db = await getLocalDatabase();
    await db.put('letter_drafts', draft);
  } catch (_) {}
};

export const getLetterDraft = async (senderUid, recipientUid) => {
  if (!senderUid || !recipientUid) return null;
  const draftKey = makeDraftKey(senderUid, recipientUid);
  if (draftCache.has(draftKey)) return draftCache.get(draftKey);
  try {
    const db = await getLocalDatabase();
    const draft = await db.get('letter_drafts', draftKey);
    if (draft) draftCache.set(draftKey, draft);
    return draft || null;
  } catch (_) {
    return null;
  }
};

export const clearLetterDraft = async (senderUid, recipientUid) => {
  if (!senderUid || !recipientUid) return;
  const draftKey = makeDraftKey(senderUid, recipientUid);
  draftCache.delete(draftKey);
  try {
    const db = await getLocalDatabase();
    await db.delete('letter_drafts', draftKey);
  } catch (_) {}
};

export const purgeLocalLettersSession = async (userId) => {
  threadCache.clear();
  letterCache.clear();
  threadLettersIndex.clear();
  draftCache.clear();
  if (!userId) return;
  try {
    const db = await getLocalDatabase();
    const tx = db.transaction('letter_drafts', 'readwrite');
    const allDrafts = await tx.store.getAll();
    for (const draft of allDrafts) {
      if (draft.senderUid === userId || draft.draftKey?.startsWith(`${userId}:`)) {
        await tx.store.delete(draft.draftKey);
      }
    }
    await tx.done;
  } catch (err) {
    console.warn('[LettersLocal] purgeLocalLettersSession error:', err.message);
  }
};

// ── LETTER PREFERENCES (Local storage) ───────────────────────────────────

export const saveLocalLetterPreference = async (uid, pref) => {
  if (!uid) return;
  try {
    const db = await getLocalDatabase();
    await db.put('letter_preferences', { uid: String(uid), ...pref, updatedAt: new Date().toISOString() });
  } catch (_) {}
};

export const getLocalLetterPreference = async (uid) => {
  if (!uid) return null;
  try {
    const db = await getLocalDatabase();
    return (await db.get('letter_preferences', String(uid))) || null;
  } catch (_) {
    return null;
  }
};


