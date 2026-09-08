import { feedCache, sortFeedPosts } from '@/data/cache/feedCache';
import { firebaseFeedSource } from '@/data/sources/firebaseFeedSource';

export const mergeFeedPosts = (currentPosts, incomingPosts) => {
  const byId = new Map();
  currentPosts.forEach((post) => {
    if (post?.id) byId.set(post.id, post);
  });
  incomingPosts.forEach((post) => {
    if (!post?.id) return;
    byId.set(post.id, { ...byId.get(post.id), ...post });
  });
  return sortFeedPosts([...byId.values()]);
};

export const createFeedRepository = ({ source, cache }) => {
  if (!source?.fetchPage || !source?.subscribeHead) {
    throw new TypeError('A feed source with fetchPage and subscribeHead is required.');
  }
  if (!cache?.read || !cache?.writePage || !cache?.upsert || !cache?.remove) {
    throw new TypeError('A feed cache with read/writePage/upsert/remove is required.');
  }

  return {
    async readCached(limit) {
      try {
        return await cache.read(limit);
      } catch (error) {
        console.warn('[FEED] Local cache read failed:', error?.message);
        return { posts: [], cursor: null, hasMore: true, cachedAt: 0 };
      }
    },

    async fetchPage(cursor = null, limit) {
      const page = await source.fetchPage({ cursor, limit });
      try {
        await cache.writePage(page, cursor);
      } catch (error) {
        console.warn('[FEED] Local cache write failed:', error?.message);
      }
      return page;
    },

    async upsertLocal(post) {
      try {
        await cache.upsert(post);
      } catch (error) {
        console.warn('[FEED] Local optimistic upsert failed:', error?.message);
      }
    },

    async removeLocal(postId) {
      try {
        await cache.remove(postId);
      } catch (error) {
        console.warn('[FEED] Local optimistic delete failed:', error?.message);
      }
    },

    subscribeHead(handlers) {
      return source.subscribeHead({
        ...handlers,
        onUpsert(post) {
          cache.upsert(post).catch((error) => {
            console.warn('[FEED] Realtime cache upsert failed:', error?.message);
          });
          handlers.onUpsert?.(post);
        },
        onRemove(postId) {
          cache.remove(postId).catch((error) => {
            console.warn('[FEED] Realtime cache delete failed:', error?.message);
          });
          handlers.onRemove?.(postId);
        },
      });
    },
  };
};

export const feedRepository = createFeedRepository({
  source: firebaseFeedSource,
  cache: feedCache,
});
