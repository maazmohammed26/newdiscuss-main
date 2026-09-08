// User Profile Database Service - Uses Secondary Firebase (Realtime Database)
// Stores: fullName, bio, socialLinks
// Uses same Auth UID as primary Firebase for sync

import {
  secondaryDatabase,
  ref,
  get,
  set,
  update,
  remove
} from './firebaseSecondary';

// Character limit for bio
export const BIO_CHAR_LIMIT = 250;

// Max social links allowed
export const MAX_SOCIAL_LINKS = 5;

// In-memory profile cache for instantaneous synchronous hydration & flicker elimination
const profileCache = new Map();
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get synchronously cached profile data if available
 * @param {string} userId - Firebase Auth UID
 * @returns {Object|null}
 */
export const getCachedUserProfile = (userId) => {
  if (!userId) return null;
  const entry = profileCache.get(String(userId));
  if (!entry) return null;
  return entry.data ? { ...entry.data } : null;
};

/**
 * Check if the cached profile data is valid and fresh
 * @param {string} userId
 * @param {number} maxAgeMs
 * @returns {boolean}
 */
export const isProfileCacheValid = (userId, maxAgeMs = DEFAULT_CACHE_TTL_MS) => {
  if (!userId) return false;
  const entry = profileCache.get(String(userId));
  if (!entry || !entry.timestamp) return false;
  return (Date.now() - entry.timestamp) < maxAgeMs;
};

/**
 * Set or update cached profile data
 * @param {string} userId
 * @param {Object} profileData
 * @param {Object} [options]
 * @returns {Object|null}
 */
export const setCachedUserProfile = (userId, profileData, options = {}) => {
  if (!userId) return null;
  const key = String(userId);
  const existing = profileCache.get(key)?.data || {};
  const merged = { ...existing, ...profileData, id: userId };
  profileCache.set(key, {
    data: merged,
    timestamp: Date.now(),
    updatedAt: merged.updatedAt || new Date().toISOString(),
    isOptimistic: Boolean(options.isOptimistic),
  });
  return { ...merged };
};

/**
 * Clear cached user profile(s)
 * @param {string} [userId] - If omitted, clears entire cache
 */
export const clearCachedUserProfile = (userId) => {
  if (userId) {
    profileCache.delete(String(userId));
  } else {
    profileCache.clear();
  }
};

/**
 * Get user profile from Realtime Database
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Object|null>} User profile data or null
 */
export const getUserProfile = async (userId) => {
  if (!userId) return null;
  try {
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      const val = snapshot.val();
      const resolved = {
        id: userId,
        ...val,
        bannerThemeId: val.bannerThemeId || null,
        socialLinks: val.socialLinks || [],
        updatedAt: val.updatedAt || new Date().toISOString()
      };

      // Check if existing cache was an optimistic update newer than remote
      const existingEntry = profileCache.get(String(userId));
      if (existingEntry?.isOptimistic && (Date.now() - existingEntry.timestamp < 10000)) {
        const merged = { ...resolved, ...existingEntry.data };
        setCachedUserProfile(userId, merged);
        return merged;
      }

      setCachedUserProfile(userId, resolved);
      return resolved;
    }
    return null;
  } catch (error) {
    console.warn('Error getting user profile (secondary DB may not be configured):', error.message);
    return getCachedUserProfile(userId);
  }
};

/**
 * Create or update user profile in Realtime Database
 * @param {string} userId - Firebase Auth UID
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object>} Updated profile data
 */
export const saveUserProfile = async (userId, profileData) => {
  if (!userId) throw new Error('User ID is required');
  const prevCached = getCachedUserProfile(userId);
  const dataToSave = {
    ...profileData,
    updatedAt: new Date().toISOString()
  };

  // Optimistically update cache immediately before remote acknowledgement
  setCachedUserProfile(userId, dataToSave, { isOptimistic: true });

  try {
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      await update(profileRef, dataToSave);
    } else {
      await set(profileRef, {
        ...dataToSave,
        createdAt: new Date().toISOString()
      });
    }
    
    const finalResult = { id: userId, ...dataToSave };
    setCachedUserProfile(userId, finalResult);
    return finalResult;
  } catch (error) {
    // Rollback optimistic state on failure
    if (prevCached) {
      setCachedUserProfile(userId, prevCached);
    } else {
      clearCachedUserProfile(userId);
    }
    console.error('Error saving user profile:', error);
    throw error;
  }
};


/**
 * Update full name
 * @param {string} userId - Firebase Auth UID
 * @param {string} fullName - Full name to save
 */
export const updateFullName = async (userId, fullName) => {
  return saveUserProfile(userId, { fullName: fullName.trim() });
};

/**
 * Delete full name
 * @param {string} userId - Firebase Auth UID
 */
export const deleteFullName = async (userId) => {
  try {
    const fullNameRef = ref(secondaryDatabase, `userProfiles/${userId}/fullName`);
    await remove(fullNameRef);
    
    // Update the updatedAt timestamp
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);
    await update(profileRef, { updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting full name:', error);
    throw error;
  }
};

/**
 * Update bio
 * @param {string} userId - Firebase Auth UID
 * @param {string} bio - Bio text (max 500 chars)
 */
export const updateBio = async (userId, bio) => {
  const trimmedBio = bio.trim().slice(0, BIO_CHAR_LIMIT);
  return saveUserProfile(userId, { bio: trimmedBio });
};

/**
 * Delete bio
 * @param {string} userId - Firebase Auth UID
 */
export const deleteBio = async (userId) => {
  try {
    const bioRef = ref(secondaryDatabase, `userProfiles/${userId}/bio`);
    await remove(bioRef);
    
    // Update the updatedAt timestamp
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);
    await update(profileRef, { updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error deleting bio:', error);
    throw error;
  }
};

/**
 * Update banner theme preset ID
 * @param {string} userId - Firebase Auth UID
 * @param {string} bannerThemeId - Preset ID (e.g. 'gradient-07')
 */
export const updateBannerTheme = async (userId, bannerThemeId) => {
  return saveUserProfile(userId, { bannerThemeId });
};

/**
 * Update social links
 * @param {string} userId - Firebase Auth UID
 * @param {Array<Object>} socialLinks - Array of social links (max 5)
 */
export const updateSocialLinks = async (userId, socialLinks) => {
  if (!Array.isArray(socialLinks)) return saveUserProfile(userId, { socialLinks: [] });
  // Validate and clean social links (max 5)
  const cleanedLinks = socialLinks
    .map(link => {
      if (!link || typeof link !== 'object') return null;
      const rawUrl = (link.url || '').trim();
      if (!rawUrl) return null;
      let validUrl = rawUrl;
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`;
      }
      const label = (link.name || link.platform || link.label || 'Website').trim();
      const platform = (link.platform || link.name || 'website').toLowerCase().trim();
      return {
        name: label,
        platform: platform,
        url: validUrl
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SOCIAL_LINKS);
  
  return saveUserProfile(userId, { socialLinks: cleanedLinks });
};

/**
 * Add a single social link
 * @param {string} userId - Firebase Auth UID
 * @param {Object} link - {name/platform/label: string, url: string}
 */
export const addSocialLink = async (userId, link) => {
  const profile = await getUserProfile(userId);
  const currentLinks = profile?.socialLinks || [];
  const updatedLinks = [...currentLinks, link];
  return updateSocialLinks(userId, updatedLinks);
};

/**
 * Update a single social link
 * @param {string} userId - Firebase Auth UID
 * @param {number} index - Index of link to update
 * @param {Object} link - {name/platform/label: string, url: string}
 */
export const editSocialLink = async (userId, index, link) => {
  const profile = await getUserProfile(userId);
  const currentLinks = [...(profile?.socialLinks || [])];
  
  if (index >= 0 && index < currentLinks.length) {
    currentLinks[index] = link;
    return updateSocialLinks(userId, currentLinks);
  }
  throw new Error('Invalid link index');
};

/**
 * Delete a single social link
 * @param {string} userId - Firebase Auth UID
 * @param {number} index - Index of link to delete
 */
export const deleteSocialLink = async (userId, index) => {
  const profile = await getUserProfile(userId);
  const currentLinks = [...(profile?.socialLinks || [])];
  
  if (index >= 0 && index < currentLinks.length) {
    currentLinks.splice(index, 1);
    return updateSocialLinks(userId, currentLinks);
  }
  throw new Error('Invalid link index');
};
