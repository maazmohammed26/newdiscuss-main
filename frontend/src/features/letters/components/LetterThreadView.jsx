import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, MapPin, Loader2, Sparkles } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import LetterCard from './LetterCard';
import LetterComposerModal from './LetterComposerModal';
import {
  getThreadLetters,
  subscribeToThreadHead,
  fetchEarlierLetters,
} from '../data/letterRepository';
import { getUserProfile } from '@/lib/userProfileDb';

export default function LetterThreadView({
  threadId,
  currentUserId,
  currentUser,
  counterpartUid,
  onBack,
}) {
  const [letters, setLetters] = useState([]);
  const [counterpartProfile, setCounterpartProfile] = useState(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [hasMoreEarlier, setHasMoreEarlier] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Fetch counterpart profile
  useEffect(() => {
    if (!counterpartUid) return;
    let isMounted = true;
    getUserProfile(counterpartUid).then((prof) => {
      if (isMounted) {
        setCounterpartProfile(prof);
        setIsProfileLoaded(true);
      }
    }).catch(() => {
      if (isMounted) setIsProfileLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, [counterpartUid]);

  const isDeletedUser = isProfileLoaded && !counterpartProfile;

  // Load initial local letters and subscribe to DB5 thread head
  useEffect(() => {
    if (!threadId) return;

    let isMounted = true;
    setIsLoading(true);

    // 1. Read fast local cached letters
    getThreadLetters(threadId, 20).then((cached) => {
      if (isMounted) {
        setLetters(cached);
        setIsLoading(false);
      }
    });

    // 2. Realtime listener for incoming letters in DB5
    const unsubscribe = subscribeToThreadHead(threadId, (freshList) => {
      if (isMounted) {
        setLetters((prev) => {
          const map = new Map();
          prev.forEach((l) => map.set(l.id, l));
          freshList.forEach((l) => map.set(l.id, l));
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return merged;
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [threadId]);

  // Load earlier letters with cursor
  const handleLoadEarlier = async () => {
    if (!letters.length || isLoadingEarlier || !hasMoreEarlier) return;
    setIsLoadingEarlier(true);

    const oldestCreatedAt = letters[0]?.createdAt;
    const earlier = await fetchEarlierLetters(threadId, oldestCreatedAt, 10);

    if (!earlier.length) {
      setHasMoreEarlier(false);
    } else {
      setLetters((prev) => {
        const map = new Map();
        earlier.forEach((l) => map.set(l.id, l));
        prev.forEach((l) => map.set(l.id, l));
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return merged;
      });
    }

    setIsLoadingEarlier(false);
  };

  const handleReply = () => {
    setIsComposerOpen(true);
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 dark:bg-black overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-16 px-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Back to letters inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <UserAvatar user={isDeletedUser ? null : counterpartProfile} size="sm" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px] sm:max-w-xs">
                  {isDeletedUser
                    ? 'Deleted user'
                    : (counterpartProfile?.displayName || counterpartProfile?.username || (isLoading ? 'Loading...' : 'Discuss Member'))}
                </span>
                {!isDeletedUser && counterpartProfile && <VerifiedBadge user={counterpartProfile} size="xs" />}
              </div>
              {!isDeletedUser && counterpartProfile?.username && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  @{counterpartProfile.username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side city badge if recipient allows */}
        {counterpartProfile?.letterCityLabel && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <MapPin className="w-3.5 h-3.5" />
            <span>{counterpartProfile.letterCityLabel}</span>
          </div>
        )}
      </div>

      {/* Letters List / Stack formation */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Load earlier letters button */}
        {hasMoreEarlier && letters.length >= 10 && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleLoadEarlier}
              disabled={isLoadingEarlier}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-200/60 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/60 dark:hover:bg-zinc-700 rounded-full transition-colors disabled:opacity-50"
            >
              {isLoadingEarlier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Load earlier letters</span>
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs text-zinc-400">Unfolding letter correspondence...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No letters yet
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Start this thread with a handwritten note. Letters take time to travel and build lasting connections.
            </p>
            <button
              type="button"
              onClick={handleReply}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Write the First Letter</span>
            </button>
          </div>
        )}

        {/* Letters cards */}
        {letters.map((letter, idx) => {
          const isLatest = idx === letters.length - 1;
          return (
            <LetterCard
              key={letter.id}
              letter={letter}
              currentUserId={currentUserId}
              senderProfile={letter.senderId === currentUserId ? currentUser : counterpartProfile}
              recipientProfile={letter.recipientId === currentUserId ? currentUser : counterpartProfile}
              onReply={handleReply}
              defaultExpanded={isLatest}
            />
          );
        })}
      </div>

      {/* Floating or Bottom Quick Reply Bar */}
      {letters.length > 0 && (
        <div className="p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
          {isDeletedUser ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
              This Discuss account has been deleted. Historical letters are retained in your inbox, but new replies cannot be sent.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleReply}
              className="w-full max-w-md inline-flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-md shadow-amber-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Write a Letter</span>
            </button>
          )}
        </div>
      )}

      {/* Composer Modal */}
      {isComposerOpen && (
        <LetterComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          currentUser={currentUser}
          recipient={counterpartProfile || { id: counterpartUid }}
          onLetterSent={(newLetter) => {
            if (newLetter) {
              setLetters((prev) => [...prev, newLetter]);
            }
          }}
        />
      )}
    </div>
  );
}
