import {
  endBefore,
  get,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  orderByChild,
  query,
} from 'firebase/database';
import { database, ref } from '@/lib/firebase';
import {
  secondaryDatabase,
  ref as secondaryRef,
  isSecondaryDbAvailable,
} from '@/lib/firebaseSecondary';
import { toAppError } from '@/data/errors/AppError';

export const DEFAULT_FEED_PAGE_SIZE = 20;
export const DEFAULT_FEED_HEAD_SIZE = 20;
const ENRICHMENT_CONCURRENCY = 5;

const snapshotValue = (result) => (
  result.status === 'fulfilled' && result.value?.exists()
    ? result.value.val()
    : {}
);

const enrichPost = async (post) => {
  const lookups = [
    get(ref(database, `votes/${post.id}`)),
    get(ref(database, `comments/${post.id}`)),
  ];

  if (isSecondaryDbAvailable()) {
    lookups.push(get(secondaryRef(secondaryDatabase, `comments/${post.id}`)));
  }

  const [votesResult, commentsResult, secondaryCommentsResult] = await Promise.allSettled(lookups);
  const votes = snapshotValue(votesResult);
  const primaryComments = snapshotValue(commentsResult);
  const secondaryComments = secondaryCommentsResult ? snapshotValue(secondaryCommentsResult) : {};

  return {
    ...post,
    upvote_count: Object.values(votes).filter((vote) => vote === 'up').length,
    downvote_count: Object.values(votes).filter((vote) => vote === 'down').length,
    comment_count: Object.keys(primaryComments).length + Object.keys(secondaryComments).length,
    votes,
  };
};

const enrichPosts = async (posts) => {
  const enriched = [];
  for (let index = 0; index < posts.length; index += ENRICHMENT_CONCURRENCY) {
    const chunk = posts.slice(index, index + ENRICHMENT_CONCURRENCY);
    enriched.push(...await Promise.all(chunk.map(enrichPost)));
  }
  return enriched;
};

const snapshotToPosts = (snapshot) => {
  const posts = [];
  snapshot.forEach((child) => {
    posts.push({ ...child.val(), id: child.key });
  });
  return posts;
};

export const normalizeFeedCursor = (cursor) => {
  if (!cursor || !cursor.id || cursor.timestamp === undefined || cursor.timestamp === null) {
    return null;
  }
  return {
    id: String(cursor.id),
    timestamp: cursor.timestamp,
  };
};

const cursorFromPosts = (posts) => {
  const oldest = posts[posts.length - 1];
  return normalizeFeedCursor(oldest && {
    id: oldest.id,
    timestamp: oldest.timestamp ?? oldest.createdAt,
  });
};

export const selectFeedWindow = (ascendingPosts, pageSize) => {
  const hasMore = ascendingPosts.length > pageSize;
  const selected = hasMore ? ascendingPosts.slice(-pageSize) : ascendingPosts;
  const posts = [...selected].reverse();
  const cursor = cursorFromPosts(posts);
  return {
    posts,
    cursor,
    hasMore: hasMore && Boolean(cursor),
  };
};

export const firebaseFeedSource = {
  async fetchPage({ cursor = null, limit = DEFAULT_FEED_PAGE_SIZE } = {}) {
    const pageSize = Math.max(1, Math.min(Number(limit) || DEFAULT_FEED_PAGE_SIZE, 50));
    const normalizedCursor = normalizeFeedCursor(cursor);
    const constraints = [orderByChild('timestamp')];

    if (normalizedCursor) {
      constraints.push(endBefore(normalizedCursor.timestamp, normalizedCursor.id));
    }
    constraints.push(limitToLast(pageSize + 1));

    try {
      const snapshot = await get(query(ref(database, 'posts'), ...constraints));
      const ascending = snapshotToPosts(snapshot);
      const selectedPage = selectFeedWindow(ascending, pageSize);
      const posts = await enrichPosts(selectedPage.posts);

      return {
        posts,
        cursor: selectedPage.cursor,
        hasMore: selectedPage.hasMore,
      };
    } catch (error) {
      throw toAppError(error, { operation: 'feed.fetchPage' });
    }
  },

  subscribeHead({
    onUpsert,
    onRemove,
    onError,
    knownPostIds = [],
    limit = DEFAULT_FEED_HEAD_SIZE,
  }) {
    const headSize = Math.max(1, Math.min(Number(limit) || DEFAULT_FEED_HEAD_SIZE, 50));
    const headQuery = query(
      ref(database, 'posts'),
      orderByChild('timestamp'),
      limitToLast(headSize)
    );

    const knownPosts = new Set(knownPostIds);
    const emitPost = async (snapshot) => {
      try {
        const post = await enrichPost({ ...snapshot.val(), id: snapshot.key });
        knownPosts.add(post.id);
        onUpsert(post);
      } catch (error) {
        onError?.(toAppError(error, { operation: 'feed.subscribeHead.enrich' }));
      }
    };

    const handleRemoved = async (snapshot) => {
      try {
        // A limited query emits child_removed when an older item merely falls
        // outside the head. Only remove it locally when the source row is gone.
        const current = await get(ref(database, `posts/${snapshot.key}`));
        if (!current.exists()) {
          knownPosts.delete(snapshot.key);
          onRemove?.(snapshot.key);
        }
      } catch (error) {
        onError?.(toAppError(error, { operation: 'feed.subscribeHead.remove' }));
      }
    };

    const unsubscribers = [
      onChildAdded(headQuery, (snapshot) => {
        if (!knownPosts.has(snapshot.key)) emitPost(snapshot);
      }, (error) => onError?.(toAppError(error))),
      onChildChanged(headQuery, emitPost, (error) => onError?.(toAppError(error))),
      onChildRemoved(headQuery, handleRemoved, (error) => onError?.(toAppError(error))),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  },
};
