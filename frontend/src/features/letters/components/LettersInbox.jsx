import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, MapPin, Users, Plus, Search, X } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import LetterThreadView from './LetterThreadView';
import LetterRecipientSearch from './LetterRecipientSearch';
import LetterComposerModal from './LetterComposerModal';
import {
  getLetterThreads,
  subscribeToLetterThreads,
  isLettersEnabled,
} from '../data/letterRepository';
import { getUserProfile, getCachedUserProfile } from '@/lib/userProfileDb';
import { getUser } from '@/lib/db';

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

  // Check feature kill switch
  const enabled = isLettersEnabled();

  // Load threads from local store first, then subscribe to DB5 updates
  useEffect(() => {
    if (!currentUserId || !enabled) return;

    let isMounted = true;

    // 1. Initial fast local read + background DB5 delta sync
    getLetterThreads(currentUserId, null, (freshThreads) => {
      if (isMounted) setThreads(freshThreads);
    }).then((cached) => {
      if (isMounted) setThreads(cached);
    });

    // 2. Realtime listener on user's thread index
    const unsubscribe = subscribeToLetterThreads(currentUserId, (updated) => {
      if (isMounted) setThreads(updated);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentUserId, enabled]);

  // Resolve counterpart profiles with deleted-user safety
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

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-black select-none relative">
      {/* Header Area */}
      <div className="px-4 pt-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
            Letters
          </h2>

          <button
            type="button"
            onClick={() => setIsRecipientSearchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 active:scale-95 text-white dark:text-black text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>
        </div>

        {/* Tab switcher: Friends vs Non-friends (explicit product terminology) */}
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Flat Threads List */}
      <div 
        className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {filteredThreads.map((thread) => {
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
              onClick={() => {
                setSelectedThread(thread);
                if (onSelectThread) onSelectThread(thread.threadId);
              }}
              className={`px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/60 cursor-pointer transition-colors ${
                hasUnread ? 'bg-neutral-50/70 dark:bg-neutral-900/40' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* 40px Avatar */}
                <div className="relative shrink-0 w-10 h-10">
                  <UserAvatar 
                    user={isDeleted ? null : profile} 
                    className="w-10 h-10 rounded-full object-cover" 
                  />
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-2 ring-white dark:ring-black absolute -top-0.5 -right-0.5" />
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

                  {/* Snippet preview in handwriting style */}
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

        {/* Empty state */}
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {activeTab === 'friends' ? 'No letters from friends yet' : 'No non-friends letters yet'}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {activeTab === 'friends'
                ? 'Send a quiet, handwritten note to a friend. Letters travel slowly and build lasting connections.'
                : 'Letters from outside your friends circle will appear here. Non-friends are limited to 1 unopened letter at a time.'}
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
      </div>

      {/* Recipient Search Modal */}
      {isRecipientSearchOpen && (
        <LetterRecipientSearch
          isOpen={isRecipientSearchOpen}
          onClose={() => setIsRecipientSearchOpen(false)}
          currentUserId={currentUserId}
          onSelectRecipient={(chosen) => {
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
