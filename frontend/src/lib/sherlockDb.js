// sherlockDb.js - Handles search history in localStorage
const HISTORY_KEY = 'discuss_sherlock_history';

export const getSearchHistory = () => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
};

export const addSearchToHistory = (username, platformCount, foundCount) => {
  try {
    const history = getSearchHistory();
    const newEntry = {
      id: Date.now().toString(),
      username,
      platformCount,
      foundCount,
      timestamp: new Date().toISOString(),
      tag: 'Local'
    };
    
    // Remove if already exists to move it to top
    const filtered = history.filter(h => h.username !== username);
    filtered.unshift(newEntry);
    
    // Keep only last 50
    if (filtered.length > 50) filtered.pop();
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error('Failed to save history', err);
    return [];
  }
};

export const clearSearchHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
