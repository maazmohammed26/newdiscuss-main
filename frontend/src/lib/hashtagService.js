import { getLocalDatabase } from '@/data/db/localDatabase';

/**
 * Standard developer and community seed tags for instant zero-latency suggestions.
 */
export const SEED_COMMUNITY_TAGS = [
  'react',
  'reactnative',
  'javascript',
  'typescript',
  'python',
  'firebase',
  'nextjs',
  'nodejs',
  'tailwindcss',
  'webdev',
  'frontend',
  'backend',
  'ai',
  'machinelearning',
  'android',
  'ios',
  'pwa',
  'docker',
  'kubernetes',
  'cloud',
  'database',
  'indexeddb',
  'realtime',
  'golang',
  'rust',
  'cpp',
  'java',
  'devops',
  'security',
  'api',
  'css',
  'html',
  'discuss',
  'opensource',
  'design',
  'performance',
];

export const MAX_HASHTAGS_PER_POST = 5;

// Regex matching hashtags safely avoiding URL fragments or invalid punctuation
const HASHTAG_REGEX = /(?:^|[^\w#])#([a-zA-Z0-9_]{1,50})(?=[^\w#]|$)/g;

/**
 * Extract inline hashtags from text.
 * Case-insensitive deduplication, normalized to lowercase.
 * Max 5 valid hashtags indexed.
 */
export const extractInlineHashtags = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      validTags: [],
      allTags: [],
      hasExceededLimit: false,
    };
  }

  const matches = [];
  let match;
  const regex = new RegExp(HASHTAG_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const rawTag = match[1];
    if (rawTag) {
      const normalized = rawTag.toLowerCase();
      if (!matches.includes(normalized)) {
        matches.push(normalized);
      }
    }
  }

  const hasExceededLimit = matches.length > MAX_HASHTAGS_PER_POST;
  const validTags = matches.slice(0, MAX_HASHTAGS_PER_POST);

  return {
    validTags,
    allTags: matches,
    hasExceededLimit,
  };
};

/**
 * Identify the active hashtag token at the cursor position.
 * Returns { query, range: [start, end] } or null.
 */
export const getActiveHashtagToken = (text, cursorPosition) => {
  if (!text || cursorPosition == null || cursorPosition < 1) return null;

  // Search backward from cursor for '#'
  let hashIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];
    if (char === '#') {
      // Must be at beginning of text or preceded by whitespace/newline
      if (i === 0 || /\s/.test(text[i - 1])) {
        hashIndex = i;
      }
      break;
    }
    // If we hit whitespace or punctuation before finding '#', this is not an active hashtag token
    if (/\s/.test(char) || /[.,!?;:()[\]{}]/.test(char)) {
      break;
    }
  }

  if (hashIndex === -1) return null;

  // Search forward from hashIndex to find token end
  let endIndex = cursorPosition;
  while (endIndex < text.length && /^[a-zA-Z0-9_]$/.test(text[endIndex])) {
    endIndex++;
  }

  // Token is from hashIndex to endIndex
  const tokenWithHash = text.slice(hashIndex, endIndex);
  const query = tokenWithHash.slice(1); // strip leading '#'

  // Avoid triggering autocomplete on purely empty '#' unless requested, but '#r' should trigger
  // Allowing query of length >= 1
  if (query.length === 0) {
    return {
      query: '',
      range: [hashIndex, endIndex],
    };
  }

  // Ensure query is valid hashtag characters only
  if (!/^[a-zA-Z0-9_]+$/.test(query)) {
    return null;
  }

  return {
    query,
    range: [hashIndex, endIndex],
  };
};

/**
 * Replace active hashtag token with selected tag.
 * Returns { newText, newCursorPosition }.
 */
export const replaceHashtagToken = (text, range, selectedTag) => {
  if (!text || !range || !selectedTag) {
    return { newText: text || '', newCursorPosition: 0 };
  }

  const [start, end] = range;
  const normalizedTag = selectedTag.replace(/^#/, '').toLowerCase();
  const replacement = `#${normalizedTag} `;

  const before = text.slice(0, start);
  const after = text.slice(end);
  const newText = before + replacement + after;
  const newCursorPosition = start + replacement.length;

  return {
    newText,
    newCursorPosition,
  };
};

// In-memory quick lookup cache
const memoryHashtagIndex = new Map();
SEED_COMMUNITY_TAGS.forEach((tag) => {
  memoryHashtagIndex.set(tag, { tag, normalizedTag: tag, usageCount: 1, lastUsedAt: Date.now() });
});

/**
 * Record hashtag usage into local cache.
 */
export const recordHashtagsUsage = async (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) return;
  const now = Date.now();

  tags.forEach((rawTag) => {
    const tag = rawTag.replace(/^#/, '').toLowerCase();
    if (!tag) return;
    const existing = memoryHashtagIndex.get(tag) || { tag, normalizedTag: tag, usageCount: 0 };
    memoryHashtagIndex.set(tag, {
      ...existing,
      usageCount: (existing.usageCount || 0) + 1,
      lastUsedAt: now,
    });
  });

  try {
    const db = await getLocalDatabase();
    if (!db?.objectStoreNames?.contains?.('hashtags')) return;
    const tx = db.transaction('hashtags', 'readwrite');
    const store = tx.objectStore('hashtags');

    await Promise.all(
      tags.map(async (rawTag) => {
        const tag = rawTag.replace(/^#/, '').toLowerCase();
        if (!tag) return;
        const current = (await store.get(tag)) || { tag, normalizedTag: tag, usageCount: 0 };
        await store.put({
          tag,
          normalizedTag: tag,
          usageCount: (current.usageCount || 0) + 1,
          lastUsedAt: now,
        });
      })
    );
  } catch (err) {
    // Non-fatal cache failure
    console.debug('[HASHTAG] Cache update error:', err?.message);
  }
};

/**
 * Harvest hashtags opportunistically from loaded posts.
 */
export const harvestHashtagsFromPosts = (posts) => {
  if (!Array.isArray(posts)) return;
  const tags = [];
  posts.forEach((p) => {
    if (Array.isArray(p.hashtags)) {
      p.hashtags.forEach((t) => t && tags.push(t));
    }
    if (p.content) {
      const extracted = extractInlineHashtags(p.content);
      extracted.validTags.forEach((t) => tags.push(t));
    }
  });
  if (tags.length > 0) {
    recordHashtagsUsage(tags).catch(() => {});
  }
};

/**
 * Query hashtag suggestions based on partial query.
 * Bounded to 5-8 suggestions maximum.
 */
export const queryHashtagSuggestions = async (rawQuery, maxSuggestions = 8) => {
  const cleanQuery = (rawQuery || '').replace(/^#/, '').toLowerCase().trim();
  const results = [];
  const seen = new Set();

  // 1. Check local IndexedDB cache if available
  try {
    const db = await getLocalDatabase();
    if (db?.objectStoreNames?.contains?.('hashtags')) {
      const allCached = await db.getAll('hashtags');
      if (Array.isArray(allCached)) {
        allCached
          .filter((item) => item.normalizedTag && (!cleanQuery || item.normalizedTag.startsWith(cleanQuery)))
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
          .forEach((item) => {
            if (!seen.has(item.normalizedTag)) {
              seen.add(item.normalizedTag);
              results.push({
                tag: item.normalizedTag,
                usageCount: item.usageCount || 1,
              });
            }
          });
      }
    }
  } catch (err) {
    console.debug('[HASHTAG] Local db query fallback:', err?.message);
  }

  // 2. Supplement from in-memory index & community seed tags
  Array.from(memoryHashtagIndex.values())
    .filter((item) => item.normalizedTag && (!cleanQuery || item.normalizedTag.startsWith(cleanQuery)))
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .forEach((item) => {
      if (!seen.has(item.normalizedTag)) {
        seen.add(item.normalizedTag);
        results.push({
          tag: item.normalizedTag,
          usageCount: item.usageCount || 1,
        });
      }
    });

  // 3. Fallback: if query is non-empty and no exact match exists yet, include query itself as first suggestion
  if (cleanQuery && !seen.has(cleanQuery) && cleanQuery.length >= 2) {
    results.unshift({
      tag: cleanQuery,
      usageCount: 0,
    });
  }

  return results.slice(0, Math.min(maxSuggestions, 8));
};
