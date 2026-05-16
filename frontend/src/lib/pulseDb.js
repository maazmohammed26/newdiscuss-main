/**
 * pulseDb.js — Pulse (Short Video) data layer
 * Uses Fifth Firebase instance (discuss-d48be RTDB)
 */

import {
  fifthDatabase,
  isFifthDbAvailable,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
} from './firebaseFifth';
import { database, ref as primaryRef, get as primaryGet } from './firebase';
import { notifyTelegramLike } from './telegramService';
import { notifyDiscordLike } from './discordService';

const pulseRef = () => ref(fifthDatabase, 'pulse');
const pulseItemRef = (id) => ref(fifthDatabase, `pulse/${id}`);
const pulseLikesRef = (id) => ref(fifthDatabase, `pulseLikes/${id}`);

function assertDb() {
  if (!isFifthDbAvailable()) throw new Error('Pulse database is not available');
}

/**
 * Create a new Pulse video entry
 */
export const createPulse = async (userId, username, photoUrl, videoData, caption = '') => {
  assertDb();
  const timestamp = Date.now();
  const pulse = {
    authorId: userId,
    authorUsername: username,
    authorPhotoUrl: photoUrl || '',
    videoUrl: videoData.url,
    thumbnailUrl: videoData.thumbnail,
    fileId: videoData.fileId,
    caption: caption.trim(),
    hashtags: extractHashtags(caption),
    createdAt: timestamp,
    likesCount: 0,
    isPublic: true
  };

  const newRef = push(pulseRef());
  await set(newRef, { ...pulse, id: newRef.key });
  return newRef.key;
};

/**
 * Get all Pulse videos (shuffled)
 */
export const getPulseFeed = async () => {
  assertDb();
  const snapshot = await get(pulseRef());
  if (!snapshot.exists()) return [];

  const pulses = Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));

  // Shuffle the feed
  return pulses.sort(() => Math.random() - 0.5);
};

/**
 * Subscribe to Pulse feed in real-time
 */
export const subscribeToPulseFeed = (callback) => {
  if (!isFifthDbAvailable()) { callback([]); return () => {}; }

  const q = query(pulseRef(), orderByChild('createdAt'));
  const unsubscribe = onValue(q, (snapshot) => {
    if (!snapshot.exists()) { callback([]); return; }
    const pulses = [];
    snapshot.forEach((child) => {
      pulses.push({ ...child.val(), id: child.key });
    });
    // Randomize for the "Reels" experience
    callback(pulses.sort(() => Math.random() - 0.5));
  });

  return unsubscribe;
};

/**
 * Toggle like on a Pulse video
 */
export const togglePulseLike = async (pulseId, userId) => {
  assertDb();
  const likeRef = ref(fifthDatabase, `pulseLikes/${pulseId}/${userId}`);
  const pulseItem = pulseItemRef(pulseId);
  
  const snapshot = await get(likeRef);
  const isLiked = snapshot.exists();

  if (isLiked) {
    await remove(likeRef);
    // Use transaction-like update for count
    const pulseSnap = await get(pulseItem);
    if (pulseSnap.exists()) {
      const currentCount = pulseSnap.val().likesCount || 0;
      await update(pulseItem, { likesCount: Math.max(0, currentCount - 1) });
    }
  } else {
    await set(likeRef, true);
    const pulseSnap = await get(pulseItem);
    if (pulseSnap.exists()) {
      const pulseData = pulseSnap.val();
      const currentCount = pulseData.likesCount || 0;
      await update(pulseItem, { likesCount: currentCount + 1 });
      
      // Notify via Telegram on new Like
      try {
        if (pulseData.authorId && pulseData.authorId !== userId) {
          const userSnap = await primaryGet(primaryRef(database, `users/${userId}`));
          const likerUsername = userSnap.exists() ? (userSnap.val().username || 'Someone') : 'Someone';
          notifyTelegramLike(pulseData.authorId, likerUsername, 'pulse').catch(e => console.error('[Telegram]', e));
          notifyDiscordLike(pulseData.authorId, likerUsername, 'pulse').catch(e => console.error('[Discord]', e));
        }
      } catch (e) {
        console.error('Error sending pulse like notification:', e);
      }
    }
  }
  
  return !isLiked;
};

/**
 * Check if user likes a Pulse video
 */
export const checkIfLiked = async (pulseId, userId) => {
  assertDb();
  const snapshot = await get(ref(fifthDatabase, `pulseLikes/${pulseId}/${userId}`));
  return snapshot.exists();
};

const extractHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#(\w+)/g);
  return matches ? [...new Set(matches.map(t => t.slice(1).toLowerCase()))] : [];
};

/**
 * Delete a Pulse video
 */
export const deletePulse = async (pulseId) => {
  assertDb();
  await remove(pulseItemRef(pulseId));
  // Cleanup likes
  await remove(pulseLikesRef(pulseId));
};

/**
 * Edit a Pulse caption
 */
export const editPulseCaption = async (pulseId, newCaption) => {
  assertDb();
  const hashtags = extractHashtags(newCaption);
  await update(pulseItemRef(pulseId), {
    caption: newCaption.trim(),
    hashtags
  });
};

/**
 * Get Pulses for a specific user
 */
export const getUserPulses = async (userId) => {
  assertDb();
  const snapshot = await get(pulseRef());
  if (!snapshot.exists()) return [];

  const pulses = Object.entries(snapshot.val())
    .map(([id, data]) => ({ id, ...data }))
    .filter(p => p.authorId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  
  return pulses;
};
