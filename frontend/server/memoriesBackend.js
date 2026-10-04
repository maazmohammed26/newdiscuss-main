'use strict';

/**
 * memoriesBackend.js
 * Server-side business logic and security policies for Discuss Memories.
 *
 * Enforces:
 * - Authenticated actor UID verification
 * - 15 memories maximum per user per calendar date
 * - Safe server-side Cloudinary asset destruction with API secret
 * - Cascading deletion to eliminate orphaned cloud or database records
 * - Lightweight sharing without image duplication
 * - Idempotent heart counters
 * - Owner-only download authorization (blocks non-owner download)
 */

const crypto = require('crypto');
const { ApiError, primaryDb } = require('./audioCallBackend');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || process.env.REACT_APP_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Destroys Cloudinary asset server-side if configured.
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
async function destroyCloudinaryAsset(publicId) {
  if (!publicId || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const shasum = crypto.createHash('sha1');
    shasum.update(stringToSign);
    const signature = shasum.digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('invalidate', 'true');
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return data.result === 'ok' || data.result === 'not found';
  } catch (e) {
    console.warn('[MemoriesBackend] Cloudinary deletion error:', e.message);
    return false;
  }
}

/**
 * Sanitizes plain text inputs.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function sanitizeText(text, max = 100) {
  return String(text || '')
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .trim()
    .slice(0, max);
}

/**
 * Validates YYYY-MM-DD date format.
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const lastDay = new Date(y, m, 0).getDate();
  return d >= 1 && d <= lastDay;
}

/**
 * Creates and persists a new memory.
 */
async function createMemoryServer({
  actorUid,
  memoryDate,
  caption = '',
  location = '',
  visibility = 'private',
  cloudinaryPublicId,
  cloudinaryUrl,
  width = 0,
  height = 0,
  format = 'jpg',
}) {
  if (!actorUid) {
    throw new ApiError(401, 'unauthenticated', 'User must be authenticated.');
  }

  if (!isValidDateStr(memoryDate)) {
    throw new ApiError(400, 'invalid-date', 'Invalid memoryDate format (YYYY-MM-DD required).');
  }

  // Validate Cloudinary publicId path matches user folder
  const expectedPrefix = `discuss/memories/${actorUid}/`;
  if (!cloudinaryPublicId || !cloudinaryPublicId.startsWith(expectedPrefix)) {
    throw new ApiError(400, 'invalid-storage-key', 'Invalid storage publicId.');
  }

  const db = primaryDb();
  const root = db.ref();

  // Enforce 15 memories maximum per user per calendar date
  const dayCountRef = root.child(`user_day_memory_count/${actorUid}/${memoryDate}`);
  const dayCountSnap = await dayCountRef.once('value');
  const currentCount = Number(dayCountSnap.val() || 0);

  if (currentCount >= 15) {
    throw new ApiError(400, 'daily-limit-reached', 'You have reached the maximum of 15 memories for this calendar date.');
  }

  const yearMonth = memoryDate.slice(0, 7);
  const memoryId = `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const cleanCaption = sanitizeText(caption, 100);
  const cleanLocation = sanitizeText(location, 100);
  const cleanVisibility = visibility === 'public' ? 'public' : 'private';

  const memory = {
    id: memoryId,
    ownerId: actorUid,
    memoryDate,
    yearMonth,
    createdAt: Date.now(),
    caption: cleanCaption,
    location: cleanLocation,
    visibility: cleanVisibility,
    cloudinaryPublicId,
    cloudinaryUrl: String(cloudinaryUrl || ''),
    imageWidth: Number(width) || 0,
    imageHeight: Number(height) || 0,
    imageFormat: String(format || 'jpg'),
    heartCount: 0,
  };

  const updates = {};
  updates[`user_memories/${actorUid}/${yearMonth}/${memoryId}`] = memory;
  updates[`user_day_memory_count/${actorUid}/${memoryDate}`] = currentCount + 1;

  if (cleanVisibility === 'public') {
    updates[`public_memories/${memoryId}`] = memory;
  }

  await root.update(updates);

  return {
    ok: true,
    memory,
  };
}

/**
 * Deletes a memory and performs cascading cleanup across storage and database references.
 */
async function deleteMemoryServer({ actorUid, memoryId, yearMonth }) {
  if (!actorUid || !memoryId || !yearMonth) {
    throw new ApiError(400, 'invalid-argument', 'Missing required deletion parameters.');
  }

  const db = primaryDb();
  const root = db.ref();

  // Retrieve existing memory from database to verify ownership
  const memorySnap = await root.child(`user_memories/${actorUid}/${yearMonth}/${memoryId}`).once('value');
  if (!memorySnap.exists()) {
    throw new ApiError(404, 'not-found', 'Memory not found or you do not have permission to delete it.');
  }

  const memory = memorySnap.val();
  if (memory.ownerId !== actorUid) {
    throw new ApiError(403, 'forbidden', 'Only the memory owner may delete this memory.');
  }

  // 1. Destroy Cloudinary asset server-side
  if (memory.cloudinaryPublicId) {
    await destroyCloudinaryAsset(memory.cloudinaryPublicId);
  }

  // 2. Discover all shared recipients to cascade share deletion
  const shareSnap = await root.child(`memory_shares/${memoryId}`).once('value');
  const sharedRecipients = shareSnap.val() ? Object.keys(shareSnap.val()) : [];

  // 3. Atomic multi-location cascading deletion
  const updates = {};
  updates[`user_memories/${actorUid}/${yearMonth}/${memoryId}`] = null;
  updates[`public_memories/${memoryId}`] = null;
  updates[`shared_sent/${actorUid}/${memoryId}`] = null;
  updates[`memory_shares/${memoryId}`] = null;
  updates[`memory_hearts/${memoryId}`] = null;

  for (const recipientUid of sharedRecipients) {
    updates[`shared_received/${recipientUid}/${memoryId}`] = null;
  }

  // Decrement day count
  if (memory.memoryDate) {
    const dayCountRef = root.child(`user_day_memory_count/${actorUid}/${memory.memoryDate}`);
    const dayCountSnap = await dayCountRef.once('value');
    const count = Number(dayCountSnap.val() || 0);
    updates[`user_day_memory_count/${actorUid}/${memory.memoryDate}`] = Math.max(0, count - 1);
  }

  await root.update(updates);

  return {
    ok: true,
    deletedId: memoryId,
  };
}

/**
 * Shares a private memory with selected Discuss users.
 */
async function shareMemoryServer({ actorUid, memoryId, yearMonth, recipientUids = [] }) {
  if (!actorUid || !memoryId || !yearMonth) {
    throw new ApiError(400, 'invalid-argument', 'Missing required parameters.');
  }

  if (!Array.isArray(recipientUids) || recipientUids.length === 0) {
    throw new ApiError(400, 'invalid-recipients', 'At least one recipient must be selected.');
  }

  const db = primaryDb();
  const root = db.ref();

  const memorySnap = await root.child(`user_memories/${actorUid}/${yearMonth}/${memoryId}`).once('value');
  if (!memorySnap.exists()) {
    throw new ApiError(404, 'not-found', 'Memory not found.');
  }

  const memory = memorySnap.val();
  if (memory.ownerId !== actorUid) {
    throw new ApiError(403, 'forbidden', 'Only the memory owner may share this memory.');
  }

  const cleanRecipients = [...new Set(recipientUids.map((r) => String(r || '').trim()))]
    .filter((r) => r && r !== actorUid);

  if (cleanRecipients.length === 0) {
    throw new ApiError(400, 'invalid-recipients', 'No valid recipients selected.');
  }

  const now = Date.now();
  const updates = {};

  for (const recipientUid of cleanRecipients) {
    // Lightweight reference for recipient
    updates[`shared_received/${recipientUid}/${memoryId}`] = {
      id: memoryId,
      memoryId,
      ownerId: actorUid,
      senderId: actorUid,
      recipientId: recipientUid,
      sharedAt: now,
      memoryDate: memory.memoryDate,
      yearMonth: memory.yearMonth,
      caption: memory.caption || '',
      location: memory.location || '',
      cloudinaryPublicId: memory.cloudinaryPublicId,
      cloudinaryUrl: memory.cloudinaryUrl,
      imageWidth: memory.imageWidth || 0,
      imageHeight: memory.imageHeight || 0,
      heartCount: memory.heartCount || 0,
    };

    updates[`memory_shares/${memoryId}/${recipientUid}`] = {
      sharedAt: now,
      recipientId: recipientUid,
    };
  }

  updates[`shared_sent/${actorUid}/${memoryId}`] = {
    id: memoryId,
    memoryId,
    ownerId: actorUid,
    sharedAt: now,
    memoryDate: memory.memoryDate,
    recipientCount: cleanRecipients.length,
  };

  await root.update(updates);

  return {
    ok: true,
    sharedCount: cleanRecipients.length,
  };
}

/**
 * Toggles heart for a public or shared memory idempotently.
 */
async function toggleHeartServer({ actorUid, memoryId }) {
  if (!actorUid || !memoryId) {
    throw new ApiError(400, 'invalid-argument', 'User ID and Memory ID are required.');
  }

  const db = primaryDb();
  const root = db.ref();

  const heartRef = root.child(`memory_hearts/${memoryId}/${actorUid}`);
  const heartSnap = await heartRef.once('value');
  const alreadyHearted = heartSnap.exists();

  const publicMemRef = root.child(`public_memories/${memoryId}`);
  const publicMemSnap = await publicMemRef.once('value');

  let currentHearts = 0;
  if (publicMemSnap.exists()) {
    currentHearts = Number(publicMemSnap.val().heartCount || 0);
  }

  const updates = {};
  if (alreadyHearted) {
    updates[`memory_hearts/${memoryId}/${actorUid}`] = null;
    updates[`user_hearts/${actorUid}/${memoryId}`] = null;
    if (publicMemSnap.exists()) {
      updates[`public_memories/${memoryId}/heartCount`] = Math.max(0, currentHearts - 1);
    }
  } else {
    updates[`memory_hearts/${memoryId}/${actorUid}`] = true;
    updates[`user_hearts/${actorUid}/${memoryId}`] = true;
    if (publicMemSnap.exists()) {
      updates[`public_memories/${memoryId}/heartCount`] = currentHearts + 1;
    }
  }

  await root.update(updates);

  return {
    ok: true,
    hearted: !alreadyHearted,
    heartCount: alreadyHearted ? Math.max(0, currentHearts - 1) : currentHearts + 1,
  };
}

/**
 * Authorizes high quality download for memory owner only.
 */
async function getAuthorizedDownloadServer({ actorUid, memoryId, yearMonth }) {
  if (!actorUid || !memoryId || !yearMonth) {
    throw new ApiError(400, 'invalid-argument', 'Missing parameters.');
  }

  const db = primaryDb();
  const root = db.ref();

  const memorySnap = await root.child(`user_memories/${actorUid}/${yearMonth}/${memoryId}`).once('value');
  if (!memorySnap.exists()) {
    throw new ApiError(404, 'not-found', 'Memory not found.');
  }

  const memory = memorySnap.val();
  if (memory.ownerId !== actorUid) {
    throw new ApiError(403, 'download-forbidden', 'Only the memory owner may download the original memory asset.');
  }

  return {
    ok: true,
    downloadUrl: memory.cloudinaryUrl,
    publicId: memory.cloudinaryPublicId,
  };
}

module.exports = {
  createMemoryServer,
  deleteMemoryServer,
  shareMemoryServer,
  toggleHeartServer,
  getAuthorizedDownloadServer,
  destroyCloudinaryAsset,
};
