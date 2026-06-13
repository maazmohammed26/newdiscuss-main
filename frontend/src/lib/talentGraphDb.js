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
export const saveAIMatches = async (userId, matches, generatingUntil) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const updates = {
      cachedMatches: matches || [],
      matchesUpdatedAt: new Date().toISOString()
    };
    if (generatingUntil !== undefined) {
      updates.matchesGeneratingUntil = generatingUntil;
    }
    await update(userRef, updates);
  } catch (error) {
    console.error('Error saving AI matches:', error);
  }
};

/**
 * Save AI Opportunity Feed
 */
export const saveOpportunityFeed = async (userId, feed, generatingUntil) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const updates = {
      cachedOpportunities: feed || [],
      opportunitiesUpdatedAt: new Date().toISOString()
    };
    if (generatingUntil !== undefined) {
      updates.opportunitiesGeneratingUntil = generatingUntil;
    }
    await update(userRef, updates);
  } catch (error) {
    console.error('Error saving opportunity feed:', error);
  }
};

/**
 * Save AI Team Recommendations
 */
export const saveTeamRecommendations = async (userId, projectName, projectDesc, recommendations, generatingUntil) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const updates = {
      cachedTeam: recommendations || [],
      teamProjectName: projectName || '',
      teamProjectDesc: projectDesc || '',
      teamRecommendationsUpdatedAt: new Date().toISOString()
    };
    if (generatingUntil !== undefined) {
      updates.teamGeneratingUntil = generatingUntil;
    }
    await update(userRef, updates);
  } catch (error) {
    console.error('Error saving team recommendations:', error);
  }
};

/**
 * Save AI Hiring Recommendations
 */
export const saveHiringRecommendations = async (userId, hiringReq, recommendations, generatingUntil) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    const updates = {
      cachedHiring: recommendations || [],
      hiringReq: hiringReq || '',
      hiringRecommendationsUpdatedAt: new Date().toISOString()
    };
    if (generatingUntil !== undefined) {
      updates.hiringGeneratingUntil = generatingUntil;
    }
    await update(userRef, updates);
  } catch (error) {
    console.error('Error saving hiring recommendations:', error);
  }
};

/**
 * Update Generating Status for a specific TalentGraph feature
 */
export const updateGeneratingState = async (userId, key, generatingUntil) => {
  try {
    const userRef = ref(database, `users/${userId}/talentGraph`);
    await update(userRef, {
      [key]: generatingUntil
    });
  } catch (error) {
    console.error(`Error updating generating state for ${key}:`, error);
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
