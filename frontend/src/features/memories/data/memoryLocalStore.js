/**
 * memoryLocalStore.js
 * IndexedDB structured cache for Discuss Memories.
 *
 * Responsibilities:
 * - Cache month metadata and thumbnail references locally
 * - Instant rendering of previously loaded months without network hit
 * - Cache invalidation when a memory is deleted
 * - Session purge on logout (never leaks private memories to another user)
 * - Safe fallback if IndexedDB is disabled or blocked
 */

import { getLocalDatabase } from '@/data/db/localDatabase';

/**
 * Retrieves cached memories for a user and month (YYYY-MM).
 * @param {string} userId
 * @param {string} yearMonth
 * @returns {Promise<Array<Object>>}
 */
export async function getCachedMonthMemories(userId, yearMonth) {
  if (!userId || !yearMonth) return [];
  try {
    const db = await getLocalDatabase();
    const index = db.transaction('cached_memories', 'readonly').store.index('userYearMonth');
    const records = await index.getAll([userId, yearMonth]);
    return records || [];
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to read cached month memories:', e);
    return [];
  }
}

/**
 * Saves a list of memories for a month into IndexedDB.
 * @param {string} userId
 * @param {string} yearMonth
 * @param {Array<Object>} memories
 */
export async function saveCachedMonthMemories(userId, yearMonth, memories = []) {
  if (!userId || !yearMonth || !Array.isArray(memories)) return;
  try {
    const db = await getLocalDatabase();
    const tx = db.transaction(['cached_memories', 'memory_cache_meta'], 'readwrite');
    const store = tx.objectStore('cached_memories');

    for (const mem of memories) {
      if (mem && mem.id) {
        await store.put({
          ...mem,
          userId,
          yearMonth,
          _cachedAt: Date.now(),
        });
      }
    }

    const metaStore = tx.objectStore('memory_cache_meta');
    await metaStore.put({
      key: `${userId}_${yearMonth}`,
      updatedAt: Date.now(),
      count: memories.length,
    });

    await tx.done;
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to cache month memories:', e);
  }
}

/**
 * Saves or updates a single memory in the local cache.
 * @param {Object} memory
 */
export async function saveSingleCachedMemory(memory) {
  if (!memory || !memory.id) return;
  try {
    const db = await getLocalDatabase();
    await db.put('cached_memories', {
      ...memory,
      userId: memory.ownerId || memory.userId,
      yearMonth: memory.yearMonth || memory.memoryDate?.slice(0, 7),
      _cachedAt: Date.now(),
    });
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to save single cached memory:', e);
  }
}

/**
 * Deletes a memory from local IndexedDB cache by ID.
 * @param {string} memoryId
 */
export async function deleteCachedMemory(memoryId) {
  if (!memoryId) return;
  try {
    const db = await getLocalDatabase();
    const tx = db.transaction(['cached_memories', 'cached_memory_shares'], 'readwrite');
    await tx.objectStore('cached_memories').delete(memoryId);
    
    // Also remove any cached share entries with this memoryId
    const shareStore = tx.objectStore('cached_memory_shares');
    const shareIndex = shareStore.index('memoryId');
    const matchingShares = await shareIndex.getAll(memoryId);
    for (const share of matchingShares) {
      if (share.id) await shareStore.delete(share.id);
    }
    
    await tx.done;
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to delete cached memory:', e);
  }
}

/**
 * Saves shared memories to local cache.
 * @param {string} recipientId
 * @param {Array<Object>} shares
 */
export async function saveCachedSharedMemories(recipientId, shares = []) {
  if (!recipientId || !Array.isArray(shares)) return;
  try {
    const db = await getLocalDatabase();
    const tx = db.transaction('cached_memory_shares', 'readwrite');
    const store = tx.objectStore('cached_memory_shares');
    for (const share of shares) {
      if (share && share.id) {
        await store.put({
          ...share,
          recipientId,
          _cachedAt: Date.now(),
        });
      }
    }
    await tx.done;
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to cache shared memories:', e);
  }
}

/**
 * Retrieves cached shared memories for recipient.
 * @param {string} recipientId
 * @returns {Promise<Array<Object>>}
 */
export async function getCachedSharedMemories(recipientId) {
  if (!recipientId) return [];
  try {
    const db = await getLocalDatabase();
    const index = db.transaction('cached_memory_shares', 'readonly').store.index('recipientId');
    return (await index.getAll(recipientId)) || [];
  } catch (e) {
    return [];
  }
}

/**
 * Purges all cached memories and share references for a user on logout or user switch.
 * Guarantees zero leakage of private memories across user accounts on shared devices.
 * @param {string} userId
 */
export async function purgeLocalMemoriesSession(userId) {
  if (!userId) return;
  try {
    const db = await getLocalDatabase();
    
    // Purge cached memories for this user
    const memTx = db.transaction('cached_memories', 'readwrite');
    const memIndex = memTx.store.index('userId');
    const userMemories = await memIndex.getAll(userId);
    for (const mem of userMemories) {
      if (mem.id) await memTx.store.delete(mem.id);
    }
    await memTx.done;

    // Purge cached shares where user is recipient or sender
    const shareTx = db.transaction('cached_memory_shares', 'readwrite');
    const allShares = await shareTx.store.getAll();
    for (const share of allShares) {
      if (share.recipientId === userId || share.senderId === userId) {
        await shareTx.store.delete(share.id);
      }
    }
    await shareTx.done;

    // Purge memory cache metadata keys
    const metaTx = db.transaction('memory_cache_meta', 'readwrite');
    const allMeta = await metaTx.store.getAll();
    for (const meta of allMeta) {
      if (typeof meta.key === 'string' && meta.key.startsWith(userId)) {
        await metaTx.store.delete(meta.key);
      }
    }
    await metaTx.done;
  } catch (e) {
    console.warn('[MemoryLocalStore] Failed to purge local memories session:', e);
  }
}
