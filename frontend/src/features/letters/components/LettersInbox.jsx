import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Mail, Send, MapPin, Search, X, WifiOff, RefreshCw } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import LetterThreadView from './LetterThreadView';
import LetterRecipientSearch from './LetterRecipientSearch';
import LetterComposerModal from './LetterComposerModal';
import {
  getLetterThreads,
  subscribeToLetterThreads,
  isLettersEnabled,
  checkPendingNonFriendLetter,
} from '../data/letterRepository';
import { getUserProfile, getCachedUserProfile } from '@/lib/userProfileDb';
import { getUser } from '@/lib/db';
import { toast } from 'sonner';

/**
 * Letters Inbox Loading State Machine:
 * IDLE -> HYDRATING_LOCAL -> SYNCING_INITIAL_REMOTE -> READY_WITH_DATA | READY_EMPTY | REFRESHING_BACKGROUND | OFFLINE_WITH_CACHE | OFFLINE_EMPTY | ERROR
 */
export default function LettersInbox({
  currentUserId,
  currentUser,
  activeThreadId = null,
  onSelectThread = null,
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'non-friends'
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState([]);
  const [profiles, setProfiles] = useState({}); // uid -> user profile
  const [selectedThread, setSelectedThread] = useState(null);
  const [isRecipientSearchOpen, setIsRecipientSearchOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState(null);

  // Loading State Machine
  const [loadingState, setLoadingState] = useState('HYDRATING_LOCAL');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonTimerRef = useRef(null);
  const slowSyncTimerRef = useRef(null);

  // Check feature kill switch
  const enabled = isLettersEnabled();

  // Hydration & Synchronization Pipeline
  const loadData = useCallback(() => {
    if (!currentUserId || !enabled) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 140ms delayed skeleton threshold: prevents flash if IndexedDB responds quickly (<100ms)
    setShowSkeleton(false);
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
    skeletonTimerRef.current = setTimeout(() => {
      setShowSkeleton(true);
    }, 140);

    setLoadingState('HYDRATING_LOCAL');

    // STEP 1 & 2: Instant local read from IndexedDB
    getLetterThreads(
      currentUserId,
      null,
      // STEP 4: Background remote DB5 delta callback
      (freshThreads, meta = {}) => {
        if (meta.isError) {
          // If remote sync fails, keep whatever is in local state, do NOT set READY_EMPTY
          if (threads.length === 0) {
            setLoadingState(navigator.onLine ? 'ERROR' : 'OFFLINE_EMPTY');
            setShowSkeleton(false);
          }
          return;
        }

        if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
        if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
        setShowSkeleton(false);
        setThreads(freshThreads || []);
        if (freshThreads && freshThreads.length > 0) {
          setLoadingState('READY_WITH_DATA');
        } else if (meta.confirmedEmpty) {
          // ONLY enter READY_EMPTY when remote snapshot was confirmed empty!
          setLoadingState('READY_EMPTY');
        } else {
          // Still waiting for true remote confirmation
          setLoadingState('SYNCING_INITIAL_REMOTE');
        }
      }
    )
      .then((cached) => {
        if (cached && cached.length > 0) {
          // Fast cached hit: immediately cancel skeleton reveal
          if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
          if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
          setShowSkeleton(false);
          setThreads(cached);
          setLoadingState(isOnline ? 'READY_WITH_DATA' : 'OFFLINE_WITH_CACHE');
        } else {
          // Cache is empty: if offline, go directly to OFFLINE_EMPTY
          if (!isOnline) {
            if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
            if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
            setShowSkeleton(false);
            setLoadingState('OFFLINE_EMPTY');
          } else {
            // STEP 3: Online with zero cache -> wait for true remote confirmation
            setLoadingState('SYNCING_INITIAL_REMOTE');
            if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
            slowSyncTimerRef.current = setTimeout(() => {
              setLoadingState((curr) => (curr === 'SYNCING_INITIAL_REMOTE' ? 'TEMPORARILY_SLOW' : curr));
            }, 2500);
          }
        }
      })
      .catch((err) => {
        console.warn('[LettersInbox] Local hydration error:', err);
        if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
        if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
        setShowSkeleton(false);
        if (!isOnline) {
          setLoadingState('OFFLINE_EMPTY');
        } else {
          setLoadingState('ERROR');
        }
      });
  }, [currentUserId, enabled, threads.length]);

  // Initial load and Realtime listener
  useEffect(() => {
    if (!currentUserId || !enabled) return;

    loadData();

    // Subscribe to DB5 thread index updates
    const unsubscribe = subscribeToLetterThreads(currentUserId, (updated, meta = {}) => {
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
      setShowSkeleton(false);
      setThreads(updated);
      if (updated.length > 0) {
        setLoadingState('READY_WITH_DATA');
      } else if (meta.confirmedEmpty) {
        setLoadingState('READY_EMPTY');
      }
    });

    return () => {
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      if (slowSyncTimerRef.current) clearTimeout(slowSyncTimerRef.current);
      unsubscribe();
    };
  }, [currentUserId, enabled, loadData]);

  // Network online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      if (loadingState === 'OFFLINE_EMPTY' || loadingState === 'OFFLINE_WITH_CACHE') {
        loadData();
      }
    };
    const handleOffline = () => {
      if (threads.length > 0) {
        setLoadingState('OFFLINE_WITH_CACHE');
      } else {
        setLoadingState('OFFLINE_EMPTY');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadingState, threads.length, loadData]);

  // Resolve counterpart profiles with deleted-user safety and cached fallback
  useEffect(() => {
    if (!threads.length) return;
    const uidsToFetch = threads
      .map((t) => t.counterpartUid)
      .filter((uid) => uid && !profiles[uid]);

    if (!uidsToFetch.length) return;

    let isMounted = true;
    Promise.all(
      uidsToFetch.map(async (uid) => {
        try {
          const userSnap = await getUser(uid);
          if (userSnap && userSnap.username) {
            const prof = await getUserProfile(uid).catch(() => null);
            return [uid, { ...userSnap, ...prof, isDeleted: false }];
          } else {
            return [uid, { isDeleted: true, displayName: 'Deleted user' }];
          }
        } catch (_) {
          const cached = getCachedUserProfile?.(uid);
          if (cached) return [uid, cached];
          return [uid, { isDeleted: false, displayName: 'Discuss Member' }];
        }
      })
    ).then((entries) => {
      if (isMounted) {
        setProfiles((prev) => {
          const next = { ...prev };
          entries.forEach(([uid, prof]) => {
            next[uid] = prof;
          });
          return next;
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [threads, profiles]);

  // Deep-link or prop thread activation
  useEffect(() => {
    if (activeThreadId && threads.length) {
      const target = threads.find((t) => t.threadId === activeThreadId);
      if (target) setSelectedThread(target);
    }
  }, [activeThreadId, threads]);

  // Preflight check when user taps on an existing thread
  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    if (onSelectThread) onSelectThread(thread.threadId);
  };

  // Filtered threads by active tab & search query
  const filteredThreads = useMemo(() => {
    let list = threads.filter((t) => {
      if (activeTab === 'friends') return t.relationBucket === 'friends';
      return t.relationBucket !== 'friends';
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => {
        const prof = profiles[t.counterpartUid];
        const name = (prof?.displayName || prof?.fullName || '').toLowerCase();
        const username = (prof?.username || '').toLowerCase();
        const snippet = (t.lastSnippet || '').toLowerCase();
        const city = (t.originCityLabel || t.destinationCityLabel || '').toLowerCase();
        return name.includes(q) || username.includes(q) || snippet.includes(q) || city.includes(q);
      });
    }

    return list;
  }, [threads, activeTab, searchQuery, profiles]);

  // Total unread counts per tab
  const friendsUnread = useMemo(
    () => threads.filter((t) => t.relationBucket === 'friends').reduce((acc, t) => acc + (t.unreadCount || 0), 0),
    [threads]
  );
  const nonFriendsUnread = useMemo(
    () => threads.filter((t) => t.relationBucket !== 'friends').reduce((acc, t) => acc + (t.unreadCount || 0), 0),
    [threads]
  );

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center select-none">
        <Mail className="w-10 h-10 text-neutral-400 mb-2" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          Letters feature is currently disabled for maintenance.
        </p>
      </div>
    );
  }

  // If a thread is selected, render dedicated full-screen LetterThreadView
  if (selectedThread) {
    return (
      <LetterThreadView
        threadId={selectedThread.threadId}
        currentUserId={currentUserId}
        currentUser={currentUser}
        counterpartUid={selectedThread.counterpartUid}
        onBack={() => {
          setSelectedThread(null);
          if (onSelectThread) onSelectThread(null);
        }}
      />
    );
  }

  // Are we currently showing the delayed skeleton?
  const isLoadingActive = (loadingState === 'HYDRATING_LOCAL' || loadingState === 'SYNCING_INITIAL_REMOTE' || loadingState === 'TEMPORARILY_SLOW') && threads.length === 0;
  const shouldRenderSkeleton = isLoadingActive && showSkeleton;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black select-none relative">
      {/* Header Area */}
      <div className="px-4 pt-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              Letters
            </h2>
            {loadingState === 'OFFLINE_WITH_CACHE' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                <WifiOff className="w-2.5 h-2.5" />
                <span>Offline</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsRecipientSearchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 active:scale-95 text-white dark:text-black text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>
        </div>

        {/* Tab switcher: Friends vs Non-friends */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
              activeTab === 'friends'
                ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Friends</span>
            {friendsUnread > 0 && (
              <span className="px-1.5 py-0.2 bg-[#EF4444] text-white rounded-full text-[10px] font-bold">
                {friendsUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('non-friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
              activeTab === 'non-friends'
                ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Non-friends</span>
            {nonFriendsUnread > 0 && (
              <span className="px-1.5 py-0.2 bg-[#EF4444] text-white rounded-full text-[10px] font-bold">
                {nonFriendsUnread}
              </span>
            )}
          </button>
        </div>

        {/* Member Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any Discuss member..."
            className="w-full pl-8 pr-8 py-2 bg-neutral-100 dark:bg-neutral-900 border-0 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Threads List / Skeleton / States Container */}
      <div 
        className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        aria-busy={isLoadingActive}
      >
        {/* State A: Delayed Letters Inbox Skeleton (Section 4) */}
        {shouldRenderSkeleton && (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-900 animate-in fade-in duration-200" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* 40px Circular Avatar Skeleton */}
                  <div className="w-10 h-10 rounded-full bg-neutral-200/70 dark:bg-neutral-800/80 shrink-0 animate-letters-skeleton" />

                  <div className="flex flex-col min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {/* Name line skeleton */}
                      <div className="w-28 h-3.5 bg-neutral-200/70 dark:bg-neutral-800/80 rounded animate-letters-skeleton" />
                      {/* Date skeleton */}
                      <div className="w-10 h-2.5 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-letters-skeleton shrink-0" />
                    </div>

                    {/* City line skeleton */}
                    <div className="w-20 h-2.5 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-letters-skeleton" />

                    {/* Preview line skeleton */}
                    <div className="w-48 max-w-full h-3 bg-neutral-200/50 dark:bg-neutral-800/60 rounded animate-letters-skeleton" />
                  </div>
                </div>
              </div>
            ))}
            {loadingState === 'TEMPORARILY_SLOW' && (
              <div className="px-4 py-3 text-center text-[11px] text-neutral-400 dark:text-neutral-500 animate-in fade-in duration-300">
                Taking a little longer...
              </div>
            )}
          </div>
        )}

        {/* State B: Loaded Threads List with smooth dissolve transition (Section 9) */}
        {!shouldRenderSkeleton && filteredThreads.map((thread) => {
          const profile = profiles[thread.counterpartUid];
          const isDeleted = profile?.isDeleted;
          const hasUnread = (thread.unreadCount || 0) > 0;
          const timeAgo = thread.lastActivityAt
            ? new Date(thread.lastActivityAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            : '';

          const counterpartName = isDeleted
            ? 'Deleted user'
            : (profile?.displayName || profile?.fullName || profile?.username || 'Discuss Member');

          return (
            <div
              key={thread.threadId}
              onClick={() => handleSelectThread(thread)}
              className={`px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors animate-in fade-in duration-150 ${
                hasUnread ? 'bg-neutral-50/70 dark:bg-neutral-900/40' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* 40px Avatar Container */}
                <div className="relative shrink-0 w-10 h-10">
                  <div className="w-10 h-10 rounded-full aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <UserAvatar 
                      user={isDeleted ? null : profile} 
                      size={40}
                      className="w-full h-full" 
                      interactive={false}
                      fit="cover"
                    />
                  </div>
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-white dark:ring-black absolute -top-0.5 -right-0.5 z-10" />
                  )}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {counterpartName}
                      </span>
                      {!isDeleted && profile && <VerifiedBadge user={profile} size="xs" />}
                    </div>

                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">
                      {timeAgo}
                    </span>
                  </div>

                  {/* Route location if present */}
                  {(thread.originCityLabel || thread.destinationCityLabel) && (
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0 text-neutral-400" />
                      <span className="truncate">
                        {thread.originCityLabel || 'Somewhere'}
                        {thread.destinationCityLabel ? ` → ${thread.destinationCityLabel}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Snippet preview in Caveat style */}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[260px] sm:max-w-xs font-['Caveat'] text-[15px] leading-tight">
                      {thread.lastSnippet || 'Sent a handwritten letter...'}
                    </p>

                    {hasUnread && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EF4444] text-white shrink-0 min-w-[16px] text-center">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* State C: Confirmed True Empty State (Sections 1, 2, 7) */}
        {!isLoadingActive && filteredThreads.length === 0 && (loadingState === 'READY_EMPTY' || loadingState === 'READY_WITH_DATA') && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              No Letters yet.
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Write something worth keeping.
            </p>
            <button
              type="button"
              onClick={() => setIsRecipientSearchOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Write a Letter</span>
            </button>
          </div>
        )}

        {/* State D: Offline with Zero Cache (Section 43) */}
        {loadingState === 'OFFLINE_EMPTY' && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 flex items-center justify-center">
              <WifiOff className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              You're offline.
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              No cached Letters available. Retry when connection returns automatically.
            </p>
          </div>
        )}

        {/* State E: Remote Error with Zero Cache (Section 44) */}
        {loadingState === 'ERROR' && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Couldn't load Letters.
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Please check your connection and try again.
            </p>
            <button
              type="button"
              onClick={loadData}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Recipient Search Modal */}
      {isRecipientSearchOpen && (
        <LetterRecipientSearch
          isOpen={isRecipientSearchOpen}
          onClose={() => setIsRecipientSearchOpen(false)}
          currentUserId={currentUserId}
          onSelectRecipient={async (chosen) => {
            setComposerRecipient(chosen);
          }}
        />
      )}

      {/* Full-screen Composer */}
      {composerRecipient && (
        <LetterComposerModal
          isOpen={Boolean(composerRecipient)}
          onClose={() => setComposerRecipient(null)}
          currentUser={currentUser}
          recipient={composerRecipient}
          onLetterSent={(newLetter) => {
            setComposerRecipient(null);
            if (newLetter?.threadId) {
              setSelectedThread({
                threadId: newLetter.threadId,
                counterpartUid: newLetter.recipientId,
              });
            }
          }}
        />
      )}
    </div>
  );
}
