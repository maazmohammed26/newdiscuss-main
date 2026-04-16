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

/**
 * Get user profile from Realtime Database
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Object|null>} User profile data or null
 */
export const getUserProfile = async (userId) => {
  try {
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);
    const snapshot = await get(profileRef);
    
    if (snapshot.exists()) {
      return {
        id: userId,
        ...snapshot.val(),
        socialLinks: snapshot.val().socialLinks || []
      };
    }
    return null;
  } catch (error) {
    console.warn('Error getting user profile (secondary DB may not be configured):', error.message);
    return null;
  }
};

/**
 * Create or update user profile in Realtime Database
 * @param {string} userId - Firebase Auth UID
 * @param {Object} profileData - Profile data to save
 * @returns {Promise<Object>} Updated profile data
 */
export const saveUserProfile = async (userId, profileData) => {
  try {
    const profileRef = ref(secondaryDatabase, `userProfiles/${userId}`);

    // Preserve createdAt for new profiles: include it in the payload only when
    // the caller explicitly supplies it (e.g. first-ever save); on subsequent
    // updates the caller won't pass createdAt, so the existing DB value is kept
    // intact because update() never removes fields that are absent from the patch.
    const dataToSave = {
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    // update() merges fields without overwriting siblings, and creates the
    // node if it doesn't exist — no pre-read needed.
    await update(profileRef, dataToSave);

    return { id: userId, ...profileData };
  } catch (error) {
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
 * Update social links
 * @param {string} userId - Firebase Auth UID
 * @param {Array<{name: string, url: string}>} socialLinks - Array of social links (max 5)
 */
export const updateSocialLinks = async (userId, socialLinks) => {
  // Validate and clean social links (max 5)
  const cleanedLinks = socialLinks
    .filter(link => link.name && link.url)
    .slice(0, MAX_SOCIAL_LINKS)
    .map(link => ({
      name: link.name.trim(),
      url: link.url.trim()
    }));
  
  return saveUserProfile(userId, { socialLinks: cleanedLinks });
};

/**
 * Add a single social link
 * @param {string} userId - Firebase Auth UID
 * @param {Object} link - {name: string, url: string}
 */
export const addSocialLink = async (userId, link) => {
  const profile = await getUserProfile(userId);
  const currentLinks = profile?.socialLinks || [];
  const updatedLinks = [...currentLinks, { name: link.name.trim(), url: link.url.trim() }];
  return updateSocialLinks(userId, updatedLinks);
};

/**
 * Update a single social link
 * @param {string} userId - Firebase Auth UID
 * @param {number} index - Index of link to update
 * @param {Object} link - {name: string, url: string}
 */
export const editSocialLink = async (userId, index, link) => {
  const profile = await getUserProfile(userId);
  const currentLinks = profile?.socialLinks || [];
  
  if (index >= 0 && index < currentLinks.length) {
    currentLinks[index] = { name: link.name.trim(), url: link.url.trim() };
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
  const currentLinks = profile?.socialLinks || [];
  
  if (index >= 0 && index < currentLinks.length) {
    currentLinks.splice(index, 1);
    return updateSocialLinks(userId, currentLinks);
  }
  throw new Error('Invalid link index');
};
