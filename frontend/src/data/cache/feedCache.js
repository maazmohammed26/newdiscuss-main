import { getLocalDatabase } from '@/data/db/localDatabase';

export const MAX_CACHED_FEED_POSTS = 300;
export const MAX_CACHED_FEED_PAGES = 20;
const FEED_META_KEY = 'feed:head';

const timeValue = (post) => {
  const raw = post?.timestamp ?? post?.createdAt ?? 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortFeedPosts = (posts) => [...posts].sort((a, b) => {
  const timeDifference = timeValue(b) - timeValue(a);
  return timeDifference || String(b?.id || '').localeCompare(String(a?.id || ''));
});

const pageKey = (requestCursor) => requestCursor
  ? `before:${requestCursor.timestamp}:${requestCursor.id}`
  : 'head';

const trimStore = async (store, rows, maxRows, oldestFirst) => {
  if (rows.length <= maxRows) return;
  const sorted = [...rows].sort(oldestFirst);
  const removeCount = rows.length - maxRows;
  for (const row of sorted.slice(0, removeCount)) {
    await store.delete(row.id ?? row.key);
  }
};

export const feedCache = {
  async read(limit = MAX_CACHED_FEED_POSTS) {
    const db = await getLocalDatabase();
    const [rows, metadata] = await Promise.all([
      db.getAll('posts'),
      db.get('cache_meta', FEED_META_KEY),
    ]);
    const posts = sortFeedPosts(rows).slice(0, limit);
    const oldest = posts[posts.length - 1];
    const fallbackCursor = oldest?.id && (oldest.timestamp ?? oldest.createdAt) != null
      ? { id: oldest.id, timestamp: oldest.timestamp ?? oldest.createdAt }
      : null;

    return {
      posts,
      cursor: metadata?.cursor || fallbackCursor,
      hasMore: metadata?.hasMore ?? Boolean(fallbackCursor),
      cachedAt: metadata?.lastSyncedAt || 0,
    };
  },

  async writePage(page, requestCursor = null) {
    const db = await getLocalDatabase();
    const now = Date.now();
    const transaction = db.transaction(['posts', 'feed_pages', 'cache_meta'], 'readwrite');
    const postsStore = transaction.objectStore('posts');
    const pagesStore = transaction.objectStore('feed_pages');
    const metadataStore = transaction.objectStore('cache_meta');

    for (const post of page.posts) {
      await postsStore.put({ ...post, cachedAt: now });
    }

    await pagesStore.put({
      key: pageKey(requestCursor),
      postIds: page.posts.map((post) => post.id),
      requestCursor,
      nextCursor: page.cursor,
      hasMore: page.hasMore,
      lastAccessedAt: now,
    });

    const [allPosts, allPages] = await Promise.all([
      postsStore.getAll(),
      pagesStore.getAll(),
    ]);
    const existingMetadata = await metadataStore.get(FEED_META_KEY);
    const sortedCachedPosts = sortFeedPosts(allPosts);
    const retainedPosts = sortedCachedPosts.slice(0, MAX_CACHED_FEED_POSTS);
    const oldestCachedPost = retainedPosts[retainedPosts.length - 1];
    const oldestCachedCursor = oldestCachedPost?.id
      && (oldestCachedPost.timestamp ?? oldestCachedPost.createdAt) != null
      ? {
          id: oldestCachedPost.id,
          timestamp: oldestCachedPost.timestamp ?? oldestCachedPost.createdAt,
        }
      : null;
    await metadataStore.put({
      ...existingMetadata,
      key: FEED_META_KEY,
      cursor: requestCursor ? page.cursor : (oldestCachedCursor || page.cursor),
      hasMore: page.hasMore,
      lastSyncedAt: requestCursor ? (existingMetadata?.lastSyncedAt || now) : now,
      lastAccessedAt: now,
      staleAt: now + (5 * 60 * 1000),
      version: 1,
    });
    await trimStore(
      postsStore,
      allPosts,
      MAX_CACHED_FEED_POSTS,
      (a, b) => timeValue(a) - timeValue(b)
    );
    await trimStore(
      pagesStore,
      allPages,
      MAX_CACHED_FEED_PAGES,
      (a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0)
    );
    await transaction.done;
  },

  async upsert(post) {
    const db = await getLocalDatabase();
    await db.put('posts', { ...post, cachedAt: Date.now() });
  },

  async remove(postId) {
    const db = await getLocalDatabase();
    await db.delete('posts', postId);
  },
};
