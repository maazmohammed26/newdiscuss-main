/**
 * memoryRepository.js
 * Client-side data coordination and synchronization layer for Discuss Memories.
 *
 * Implements:
 * - Local-first cache reads via IndexedDB (instant UI paint)
 * - Lightweight targeted month synchronization (zero lifetime database dumps)
 * - Client-side image compression prior to transfer
 * - Secure API delegation for upload/delete/share operations
 * - 15-memories-per-day enforcement
 * - Safe cache invalidation
 */

import imageCompression from 'browser-image-compression';
import { database, ref, get, query, orderByChild, limitToLast } from '@/lib/firebase';
import { getAuthenticatedIdToken } from '@/lib/authenticatedRequest';
import { memoryStorage } from './memoryStorageService';
import {
  getCachedMonthMemories,
  saveCachedMonthMemories,
  saveSingleCachedMemory,
  deleteCachedMemory,
  getCachedSharedMemories,
  saveCachedSharedMemories,
} from './memoryLocalStore';
import { isValidDateStr, getYearMonth } from '../utils/dateUtils';

const MEMORIES_API_URL = '/api/memories';

/**
 * Resolves Firebase Auth ID token from the passed user object or authenticated session.
 * @param {Object} [user]
 * @returns {Promise<string>}
 */
async function resolveAuthToken(user) {
  if (typeof user?.getIdToken === 'function') {
    try {
      const token = await user.getIdToken();
      if (token) return token;
    } catch (_) {}
  }
  try {
    return await getAuthenticatedIdToken();
  } catch (err) {
    console.warn('[Memories] Could not resolve ID token from session:', err.message);
    return '';
  }
}

/**
 * Compresses an image file client-side before cloud upload.
 * Preserves high visual fidelity while reducing 10-20MB mobile photos to ~400-900KB.
 * @param {File|Blob} file
 * @returns {Promise<File|Blob>}
 */
export async function compressMemoryImage(file) {
  if (!file) throw new Error('No file provided for compression.');
  
  // If file is already reasonably sized (< 600KB) and JPEG/WEBP, skip heavy compression
  if (file.size < 600 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file;
  }

  const options = {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 2200,
    useWebWorker: false, // Runs directly on Canvas; avoids blob worker CSP restrictions
    fileType: 'image/webp',
    initialQuality: 0.88,
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn('[Memories] Image compression fallback to original:', error);
    return file;
  }
}

/**
 * Fetches memories for a specific month with local-first cache-and-revalidate.
 * @param {string} userId
 * @param {string} yearMonth (YYYY-MM)
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Array<Object>>}
 */
export async function getMonthMemories(userId, yearMonth, forceRefresh = false) {
  if (!userId || !yearMonth) return [];

  // 1. Try local cache first for instant paint
  let cached = [];
  if (!forceRefresh) {
    cached = await getCachedMonthMemories(userId, yearMonth);
  }

  // 2. Fetch fresh month metadata from Firebase RTDB
  try {
    const monthRef = ref(database, `user_memories/${userId}/${yearMonth}`);
    const snapshot = await get(monthRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      const memories = Object.values(data).sort((a, b) => {
        // Sort by memoryDate ascending, then createdAt ascending
        if (a.memoryDate !== b.memoryDate) {
          return a.memoryDate.localeCompare(b.memoryDate);
        }
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      // Update local IndexedDB cache asynchronously
      saveCachedMonthMemories(userId, yearMonth, memories);
      return memories;
    } else {
      // Month is empty in cloud
      saveCachedMonthMemories(userId, yearMonth, []);
      return [];
    }
  } catch (error) {
    console.warn('[Memories] Failed to fetch month memories from network:', error);
    // If offline, return cached content
    return cached;
  }
}

/**
 * Retrieves the count of memories for a user on a given date.
 * @param {string} userId
 * @param {string} dateStr (YYYY-MM-DD)
 * @returns {Promise<number>}
 */
export async function getDayMemoryCount(userId, dateStr) {
  if (!userId || !dateStr) return 0;
  try {
    const countRef = ref(database, `user_day_memory_count/${userId}/${dateStr}`);
    const snapshot = await get(countRef);
    return Number(snapshot.val() || 0);
  } catch (_) {
    return 0;
  }
}

/**
 * Uploads, compresses, and creates a new Memory.
 * @param {File} file
 * @param {{ memoryDate: string, caption?: string, location?: string, visibility?: 'private'|'public' }} fields
 * @param {Object} user (current auth user)
 * @returns {Promise<Object>} The created memory
 */
export async function createMemory(file, { memoryDate, caption = '', location = '', visibility = 'private' }, user) {
  const userId = user?.uid || user?.id;
  if (!userId) throw new Error('You must be logged in to create a memory.');

  if (!isValidDateStr(memoryDate)) {
    throw new Error('Invalid memory date. Please select a valid calendar date.');
  }

  // 1. Enforce 15 memories limit per day client-side
  const currentCount = await getDayMemoryCount(userId, memoryDate);
  if (currentCount >= 15) {
    throw new Error('You have reached the maximum limit of 15 memories for this calendar date.');
  }

  // 2. Compress image client-side
  const compressedFile = await compressMemoryImage(file);

  // 3. Generate stable memory identifier
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 4. Upload to Cloudinary under discuss/memories/<userId>/<memoryId>
  const uploadResult = await memoryStorage.uploadMemory(compressedFile, {
    userId,
    memoryId,
  });

  // 5. Authorize creation via backend serverless API
  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to save your memory.');
  }
  const response = await fetch(MEMORIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'create',
      memoryDate,
      caption: caption.trim().slice(0, 100),
      location: location.trim().slice(0, 100),
      visibility,
      cloudinaryPublicId: uploadResult.publicId,
      cloudinaryUrl: uploadResult.secureUrl,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to save memory.');
  }

  const created = data.memory;

  // 6. Update local IndexedDB cache immediately
  await saveSingleCachedMemory(created);

  return created;
}

/**
 * Permanently deletes a memory with full cloud & database cascading cleanup.
 * @param {string} memoryId
 * @param {string} yearMonth
 * @param {Object} user
 */
export async function deleteMemory(memoryId, yearMonth, user) {
  const userId = user?.uid || user?.id;
  if (!userId || !memoryId || !yearMonth) {
    throw new Error('Missing parameters to delete memory.');
  }

  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to delete your memory.');
  }
  const response = await fetch(MEMORIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'delete',
      memoryId,
      yearMonth,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to delete memory.');
  }

  // Clean local IndexedDB cache
  await deleteCachedMemory(memoryId);

  return true;
}

/**
 * Retrieves the current shared recipients for a specific memory.
 * @param {string} memoryId
 * @param {Object} user
 * @returns {Promise<Array<Object>>}
 */
export async function getMemoryShares(memoryId, user) {
  if (!memoryId) return [];

  const token = await resolveAuthToken(user);
  if (!token) return [];

  try {
    const response = await fetch(`${MEMORIES_API_URL}?action=get_shares&memoryId=${memoryId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && Array.isArray(data.recipients)) {
        return data.recipients;
      }
    }
  } catch (err) {
    console.warn('[Memories] Failed to get memory shares:', err.message);
  }

  return [];
}

/**
 * Shares or updates shared recipient list for a memory.
 * @param {string} memoryId
 * @param {string} yearMonth
 * @param {Array<string>} recipientUids
 * @param {Object} user
 */
export async function shareMemory(memoryId, yearMonth, recipientUids = [], user) {
  const userId = user?.uid || user?.id;
  if (!userId || !memoryId || !yearMonth) {
    throw new Error('Missing parameters to share memory.');
  }

  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to update sharing.');
  }
  const response = await fetch(MEMORIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'share',
      memoryId,
      yearMonth,
      recipientUids,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to update sharing.');
  }

  return data;
}

/**
 * Updates memory visibility between 'public' and 'private'.
 * @param {string} memoryId
 * @param {string} yearMonth
 * @param {'public'|'private'} visibility
 * @param {Object} user
 * @returns {Promise<Object>} The updated memory
 */
export async function updateMemoryVisibility(memoryId, yearMonth, visibility, user) {
  const userId = user?.uid || user?.id;
  if (!userId || !memoryId || !yearMonth) {
    throw new Error('Missing parameters to update memory visibility.');
  }

  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to update visibility.');
  }

  const response = await fetch(MEMORIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'visibility',
      memoryId,
      yearMonth,
      visibility,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to update memory visibility.');
  }

  if (data.memory) {
    await saveSingleCachedMemory(data.memory);
  }

  return data.memory;
}

/**
 * Toggles heart for a public or shared memory.
 * @param {string} memoryId
 * @param {Object} user
 * @returns {Promise<{ hearted: boolean, heartCount: number }>}
 */
export async function toggleHeart(memoryId, user) {
  const userId = user?.uid || user?.id;
  if (!userId || !memoryId) throw new Error('Authentication required.');

  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to heart memories.');
  }
  const response = await fetch(MEMORIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'heart',
      memoryId,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Failed to update heart.');
  }

  return {
    hearted: data.hearted,
    heartCount: data.heartCount,
  };
}

/**
 * Authorizes and triggers download for the memory owner.
 * Blocks non-owners.
 * @param {string} memoryId
 * @param {string} yearMonth
 * @param {Object} user
 */
export async function downloadMemory(memoryId, yearMonth, user) {
  const userId = user?.uid || user?.id;
  if (!userId || !memoryId || !yearMonth) throw new Error('Missing parameters.');

  const token = await resolveAuthToken(user);
  if (!token) {
    throw new Error('Please sign in to download your memory.');
  }
  const response = await fetch(`${MEMORIES_API_URL}?action=download&memoryId=${memoryId}&yearMonth=${yearMonth}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Download unauthorized.');
  }

  const downloadUrl = memoryStorage.getDownloadUrl(data.publicId, `discuss_memory_${memoryId}.jpg`);
  
  // Trigger browser download via anchor
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `discuss_memory_${memoryId}.jpg`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return true;
}

/**
 * Fetches memories shared with the current user.
 * Tries server API first (Admin SDK), falls back to RTDB and IndexedDB cache.
 * @param {string} userId
 * @param {Object} [user]
 * @returns {Promise<Array<Object>>}
 */
export async function getSharedReceivedMemories(userId, user = null) {
  if (!userId) return [];
  const cached = await getCachedSharedMemories(userId);

  // 1. Try server API first
  try {
    const token = await resolveAuthToken(user);
    if (token) {
      const res = await fetch(`${MEMORIES_API_URL}?action=shared_received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.memories)) {
          saveCachedSharedMemories(userId, data.memories);
          return data.memories;
        }
      }
    }
  } catch (_) {}

  // 2. Direct RTDB fallback
  try {
    const sharesRef = ref(database, `shared_received/${userId}`);
    const snapshot = await get(sharesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const shares = Object.values(data).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0));
      saveCachedSharedMemories(userId, shares);
      return shares;
    }
    return cached;
  } catch (e) {
    console.warn('[Memories] Failed to fetch shared received:', e);
    return cached;
  }
}

/**
 * Fetches memories shared by the current user.
 * Tries server API first (Admin SDK), falls back to RTDB.
 * @param {string} userId
 * @param {Object} [user]
 * @returns {Promise<Array<Object>>}
 */
export async function getSharedSentMemories(userId, user = null) {
  if (!userId) return [];

  // 1. Try server API first
  try {
    const token = await resolveAuthToken(user);
    if (token) {
      const res = await fetch(`${MEMORIES_API_URL}?action=shared_sent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.memories)) {
          return data.memories;
        }
      }
    }
  } catch (_) {}

  // 2. Direct RTDB fallback
  try {
    const sentRef = ref(database, `shared_sent/${userId}`);
    const snapshot = await get(sentRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data).sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0));
    }
    return [];
  } catch (e) {
    console.warn('[Memories] Failed to fetch shared sent:', e);
    return [];
  }
}

/**
 * Fetches paginated public memories.
 * Uses secure serverless API endpoint with fallback to RTDB query.
 * @param {number} [limit=20]
 * @param {Object} [user]
 * @returns {Promise<Array<Object>>}
 */
export async function getPublicMemories(limit = 20, user = null) {
  // 1. Try serverless API first (uses Admin SDK, bypasses client RTDB security rules/indexes)
  try {
    const token = await resolveAuthToken(user);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${MEMORIES_API_URL}?action=public&limit=${limit}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.memories)) {
        return data.memories;
      }
    }
  } catch (apiErr) {
    console.warn('[Memories] API getPublicMemories fallback to RTDB:', apiErr.message);
  }

  // 2. Direct RTDB query fallback
  try {
    const publicRef = query(ref(database, 'public_memories'), orderByChild('createdAt'), limitToLast(limit));
    const snapshot = await get(publicRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Reverse so newest appears first
      return Object.values(data).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return [];
  } catch (e) {
    console.warn('[Memories] Failed to fetch public memories:', e);
    return [];
  }
}
