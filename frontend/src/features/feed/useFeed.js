import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { feedRepository, mergeFeedPosts } from '@/data/repositories/feedRepository';
import { DEFAULT_FEED_PAGE_SIZE } from '@/data/sources/firebaseFeedSource';

const EMPTY_PAGE = { posts: [], cursor: null, hasMore: true };

export const useFeed = ({
  initialPosts = [],
  repository = feedRepository,
  pageSize = DEFAULT_FEED_PAGE_SIZE,
} = {}) => {
  const initial = Array.isArray(initialPosts) ? initialPosts : [];
  const [posts, setPosts] = useState(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [newPostCount, setNewPostCount] = useState(0);
  const cursorRef = useRef(null);
  const postsRef = useRef(initial);
  const pendingHeadRef = useRef([]);
  const mountedRef = useRef(true);

  const updatePosts = useCallback((updater, transition = false) => {
    const apply = () => {
      setPosts((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        postsRef.current = next;
        return next;
      });
    };
    if (transition) startTransition(apply);
    else apply();
  }, []);

  const applyPage = useCallback((page, replaceCursor = true) => {
    updatePosts((current) => mergeFeedPosts(current, page.posts), true);
    if (replaceCursor) {
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
    }
  }, [updatePosts]);

  const refreshHead = useCallback(async () => {
    try {
      const page = await repository.fetchPage(null, pageSize);
      if (!mountedRef.current) return EMPTY_PAGE;
      applyPage(page, !cursorRef.current);
      setError(null);
      return page;
    } catch (nextError) {
      if (mountedRef.current) setError(nextError);
      return EMPTY_PAGE;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [applyPage, pageSize, repository]);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribe = () => {};

    const bootstrap = async () => {
      const cached = await repository.readCached();
      if (!mountedRef.current) return;
      if (cached.posts.length) {
        updatePosts((current) => mergeFeedPosts(current, cached.posts));
        cursorRef.current = cached.cursor;
        setHasMore(cached.hasMore);
        setLoading(false);
      }

      if (navigator.onLine) await refreshHead();
      else setLoading(false);
      if (!mountedRef.current) return;

      unsubscribe = repository.subscribeHead({
        knownPostIds: postsRef.current.map((post) => post.id),
        onUpsert(post) {
          if (!mountedRef.current) return;
          const existing = postsRef.current.some((item) => item.id === post.id);
          const farFromTop = window.scrollY > 600;

          if (!existing && farFromTop) {
            pendingHeadRef.current = mergeFeedPosts(pendingHeadRef.current, [post]);
            setNewPostCount(pendingHeadRef.current.length);
            return;
          }
          updatePosts((current) => mergeFeedPosts(current, [post]), true);
        },
        onRemove(postId) {
          if (!mountedRef.current) return;
          pendingHeadRef.current = pendingHeadRef.current.filter((post) => post.id !== postId);
          setNewPostCount(pendingHeadRef.current.length);
          updatePosts((current) => current.filter((post) => post.id !== postId));
        },
        onError(nextError) {
          if (mountedRef.current) setError(nextError);
        },
      });
    };

    bootstrap();
    const handleOnline = () => refreshHead();
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [refreshHead, repository, updatePosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !navigator.onLine) return;
    const cursor = cursorRef.current;
    if (!cursor) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);
    try {
      const page = await repository.fetchPage(cursor, pageSize);
      if (!mountedRef.current) return;
      applyPage(page);
      setError(null);
    } catch (nextError) {
      if (mountedRef.current) setError(nextError);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [applyPage, hasMore, loadingMore, pageSize, repository]);

  const showNewPosts = useCallback(() => {
    const pending = pendingHeadRef.current;
    pendingHeadRef.current = [];
    setNewPostCount(0);
    updatePosts((current) => mergeFeedPosts(current, pending));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updatePosts]);

  const removePost = useCallback((postId) => {
    updatePosts((current) => current.filter((post) => post.id !== postId));
    repository.removeLocal(postId);
  }, [repository, updatePosts]);

  const updatePost = useCallback((post) => {
    updatePosts((current) => mergeFeedPosts(current, [post]));
    repository.upsertLocal(post);
  }, [repository, updatePosts]);

  const patchPost = useCallback((postId, updates) => {
    updatePosts((current) => current.map((post) => {
      if (post.id !== postId) return post;
      const patched = { ...post, ...updates, id: postId };
      repository.upsertLocal(patched);
      return patched;
    }));
  }, [repository, updatePosts]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    newPostCount,
    loadMore,
    refreshHead,
    showNewPosts,
    removePost,
    updatePost,
    patchPost,
  };
};
