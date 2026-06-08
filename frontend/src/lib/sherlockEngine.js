// sherlockEngine.js - Search Provider Engine
// Mock provider designed to be easily swapped with a real backend API

// Simple hash function to make the random mock consistent per username/platform combo
const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

// Simulate a network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks a single username against a list of platforms.
 * @param {string} username - The username to search.
 * @param {Array} platforms - List of platform objects.
 * @param {Function} onProgress - Callback triggered when a platform check completes.
 * @returns {Promise<Array>} - The complete array of result objects.
 */
export const checkUsername = async (username, platforms, onProgress) => {
  const results = [];
  
  // Create promises for parallel execution simulation
  const checks = platforms.map(async (platform) => {
    // Simulate varying network delays (200ms to 2000ms)
    const mockDelay = Math.floor(Math.random() * 1800) + 200;
    await delay(mockDelay);
    
    // Determine consistent mock status based on hash
    const hash = Math.abs(hashCode(username + platform.name));
    
    // Simulate finding the username ~30% of the time, or ~60% if the username is common (length < 6)
    const threshold = username.length < 6 ? 60 : 30;
    const isFound = (hash % 100) < threshold;
    
    // Sometimes simulate an error/timeout
    const isError = (hash % 100) > 95;
    
    let status = 'Not Found';
    if (isFound) status = 'Found';
    if (isError) status = 'Error';

    const result = {
      platform: platform.name,
      category: platform.category,
      icon: platform.icon,
      color: platform.color,
      url: platform.url.replace('{}', username),
      status,
    };
    
    results.push(result);
    
    if (onProgress) {
      onProgress(result, results.length, platforms.length);
    }
    
    return result;
  });

  await Promise.all(checks);
  return results;
};

/**
 * Checks multiple usernames (Bulk Search)
 */
export const checkBulkUsernames = async (usernames, platforms, onOverallProgress) => {
  const allResults = {};
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i].trim();
    if (!username) continue;
    
    const results = await checkUsername(username, platforms, (res, current, total) => {
      if (onOverallProgress) {
        onOverallProgress(username, res, current, total, i, usernames.length);
      }
    });
    
    allResults[username] = results;
  }
  return allResults;
};
