// Database helper for Discuss AI TalentGraph features
// Stores data directly under users/${userId}/talentGraph in the primary Realtime Database

import { database, ref, get, update, push } from './firebase';

/**
 * Update user skills and mark onboarding complete
 */
export const updateUserSkills = async (userId, skills) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const updates = {
      skills: skills || [],
      hasCompletedOnboarding: true,
      updatedAt: new Date().toISOString()
    };
    await update(userRef, updates);
    return updates;
  } catch (error) {
    console.error('Error updating user skills:', error);
    throw error;
  }
};

/**
 * Get user skills and onboarding state
 */
export const getUserTalentGraph = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {
      skills: [],
      hasCompletedOnboarding: false
    };
  } catch (error) {
    console.error('Error getting user talent graph:', error);
    return {
      skills: [],
      hasCompletedOnboarding: false
    };
  }
};

/**
 * Save AI Insights / analysis
 */
export const saveAIInsights = async (userId, insights) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph/aiInsights`);
    await update(userRef, {
      ...insights,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving AI insights:', error);
  }
};

/**
 * Save AI Developer Matches
 */
export const saveAIMatches = async (userId, matches) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    await update(userRef, {
      cachedMatches: matches || [],
      matchesUpdatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving AI matches:', error);
  }
};

/**
 * Save AI Opportunity Feed
 */
export const saveOpportunityFeed = async (userId, feed) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    await update(userRef, {
      cachedOpportunities: feed || [],
      opportunitiesUpdatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving opportunity feed:', error);
  }
};

/**
 * Log an AI Action for Transparency
 */
export const logAIAction = async (userId, type, description) => {
  try {
    const logsRef = ref(database, `users/${userId}/talentGraph/actionsLog`);
    const newLogRef = push(logsRef);
    await update(newLogRef, {
      id: newLogRef.key,
      type,
      description,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging AI action:', error);
  }
};

/**
 * Get AI Actions Log
 */
export const getAIActions = async (userId) => {
  try {
    const logsRef = ref(database, `users/${userId}/talentGraph/actionsLog`);
    const snapshot = await get(logsRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    return [];
  } catch (error) {
    console.error('Error getting AI actions:', error);
    return [];
  }
};
