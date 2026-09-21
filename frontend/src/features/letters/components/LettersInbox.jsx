import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, MapPin, Sparkles, Clock, Users, Globe, Plus } from 'lucide-react';
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
import { getUserProfile } from '@/lib/userProfileDb';

export default function LettersInbox({
  currentUserId,
  currentUser,
  activeThreadId = null,
  onSelectThread = null,
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'non-friends'
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

  // Resolve counterpart profiles
  useEffect(() => {
    if (!threads.length) return;
    const uidsToFetch = threads
      .map((t) => t.counterpartUid)
      .filter((uid) => uid && !profiles[uid]);

    if (!uidsToFetch.length) return;

    let isMounted = true;
    Promise.all(
      uidsToFetch.map(async (uid) => {
        const prof = await getUserProfile(uid);
        return [uid, prof];
      })
    ).then((entries) => {
      if (isMounted) {
        setProfiles((prev) => {
          const next = { ...prev };
          entries.forEach(([uid, prof]) => {
            next[uid] = prof || { isDeleted: true };
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

  // Filtered threads by active tab
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (activeTab === 'friends') return t.relationBucket === 'friends';
      return t.relationBucket !== 'friends';
    });
  }, [threads, activeTab]);

  // Total unread counts per tab
  const friendsUnread = useMemo(
    () => threads.filter((t) => t.relationBucket === 'friends').reduce((acc, t) => acc + (t.unreadCount || 0), 0),
    [threads]
  );
  const communityUnread = useMemo(
    () => threads.filter((t) => t.relationBucket !== 'friends').reduce((acc, t) => acc + (t.unreadCount || 0), 0),
    [threads]
  );

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Mail className="w-10 h-10 text-zinc-400 mb-2" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Letters feature is currently disabled for maintenance.
        </p>
      </div>
    );
  }

  // If a thread is selected, render LetterThreadView
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
    <div className="w-full h-full flex flex-col bg-zinc-50 dark:bg-black select-none relative">
      {/* Top Header & Sub-navigation */}
      <div className="px-4 pt-3 pb-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Letters Inbox
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsRecipientSearchOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm shadow-amber-500/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>
        </div>

        {/* Tab switcher: Friends vs Community */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends</span>
            {friendsUnread > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {friendsUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('non-friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'non-friends'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Community</span>
            {communityUnread > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                {communityUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
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

          return (
            <div
              key={thread.threadId}
              onClick={() => {
                setSelectedThread(thread);
                if (onSelectThread) onSelectThread(thread.threadId);
              }}
              className={`p-4 flex items-center justify-between hover:bg-amber-500/[0.04] cursor-pointer transition-colors ${
                hasUnread ? 'bg-amber-500/[0.03]' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar user={isDeleted ? null : profile} size="md" />
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-black absolute -top-0.5 -right-0.5" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {isDeleted ? 'Deleted user' : profile?.displayName || profile?.username || 'Discuss Member'}
                    </span>
                    {!isDeleted && profile?.username && <VerifiedBadge user={profile} size="xs" />}
                  </div>

                  {/* Route stamp preview */}
                  {(thread.originCityLabel || thread.destinationCityLabel) && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {thread.originCityLabel || 'Somewhere'}
                        {thread.destinationCityLabel ? ` → ${thread.destinationCityLabel}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Snippet preview */}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs mt-0.5 font-['Caveat'] text-base">
                    {thread.lastSnippet || 'Sent a handwritten letter...'}
                  </p>
                </div>
              </div>

              {/* Right side metadata */}
              <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                <span className="text-[11px] text-zinc-400">{timeAgo}</span>
                {hasUnread ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {thread.unreadCount} new
                  </span>
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-700">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {activeTab === 'friends' ? 'No letters from friends yet' : 'No community letters yet'}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {activeTab === 'friends'
                ? 'Send a warm, handwritten note to a friend. Letters travel slowly and feel personal.'
                : 'Letters from outside your friends circle will land here. Non-friends are limited to 1 unopened letter at a time.'}
            </p>
            <button
              type="button"
              onClick={() => setIsRecipientSearchOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
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

      {/* Composer Modal */}
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
