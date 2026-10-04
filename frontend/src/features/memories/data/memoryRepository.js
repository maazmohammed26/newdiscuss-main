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
    useWebWorker: true,
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
  const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
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

  const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
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
 * Shares a private memory with selected Discuss users.
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

  const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
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
    throw new Error(data.error || 'Failed to share memory.');
  }

  return data;
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

  const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
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

  const token = typeof user.getIdToken === 'function' ? await user.getIdToken() : '';
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
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getSharedReceivedMemories(userId) {
  if (!userId) return [];
  try {
    const cached = await getCachedSharedMemories(userId);
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
    return [];
  }
}

/**
 * Fetches memories shared by the current user.
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getSharedSentMemories(userId) {
  if (!userId) return [];
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
 * @param {number} [limit=20]
 * @returns {Promise<Array<Object>>}
 */
export async function getPublicMemories(limit = 20) {
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
