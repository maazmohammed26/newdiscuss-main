import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Send, MapPin, Loader2, Mail } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import LetterCard from './LetterCard';
import LetterComposerModal from './LetterComposerModal';
import {
  getThreadLetters,
  subscribeToThreadHead,
  fetchEarlierLetters,
} from '../data/letterRepository';
import { getUserProfile, getCachedUserProfile } from '@/lib/userProfileDb';
import { database, ref, get } from '@/lib/firebase';

/**
 * Reconciles local and realtime letters by clientMutationId and id,
 * ensuring optimistic records are seamlessly replaced when canonical echoes arrive.
 */
const reconcileLettersList = (existingLetters, incomingLetters) => {
  const all = [...(existingLetters || []), ...(incomingLetters || [])];
  const canonicalMutations = new Set();

  all.forEach((l) => {
    if (l && l.clientMutationId && !String(l.id || '').startsWith('opt_')) {
      canonicalMutations.add(l.clientMutationId);
    }
  });

  const dedupMap = new Map();
  for (const l of all) {
    if (!l || !l.id) continue;
    const isOpt = String(l.id).startsWith('opt_');
    if (isOpt && l.clientMutationId && canonicalMutations.has(l.clientMutationId)) {
      continue; // Exclude orphan optimistic duplicate
    }
    const key = l.clientMutationId || l.id;
    if (dedupMap.has(key)) {
      const prev = dedupMap.get(key);
      if (String(prev.id).startsWith('opt_') && !isOpt) {
        dedupMap.set(key, l);
      } else {
        dedupMap.set(key, { ...prev, ...l });
      }
    } else {
      dedupMap.set(key, l);
    }
  }

  const result = Array.from(dedupMap.values());
  result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return result;
};

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

  // Fetch counterpart profile with deleted-user safety and cached fallback
  useEffect(() => {
    if (!counterpartUid) return;
    let isMounted = true;

    // Use fast local profile cache first
    const cached = getCachedUserProfile?.(counterpartUid);
    if (cached && isMounted) {
      setCounterpartProfile(cached);
    }

    const loadProfile = async () => {
      try {
        const userRef = ref(database, `users/${counterpartUid}`);
        const snap = await get(userRef);
        if (!isMounted) return;

        if (snap.exists()) {
          const val = snap.val();
          if (val && val.isDeleted) {
            setCounterpartProfile({ isDeleted: true });
          } else {
            const extProfile = await getUserProfile(counterpartUid).catch(() => null);
            if (isMounted) {
              setCounterpartProfile({ id: counterpartUid, ...val, ...extProfile, isDeleted: false });
            }
          }
        } else {
          // Explicitly absent in canonical DB
          setCounterpartProfile({ isDeleted: true });
        }
      } catch (err) {
        // Transient network or server failure — DO NOT mark as deleted
        console.warn(`[LetterThreadView] Transient profile load error for ${counterpartUid}:`, err?.message);
        if (cached && isMounted) {
          setCounterpartProfile(cached);
        }
      } finally {
        if (isMounted) setIsProfileLoaded(true);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [counterpartUid]);

  const isDeletedUser = Boolean(
    isProfileLoaded && counterpartProfile?.isDeleted === true
  );

  // Load initial local letters and subscribe to DB5 thread head
  useEffect(() => {
    if (!threadId) return;

    let isMounted = true;
    setIsLoading(true);

    // 1. Read fast local cached letters
    getThreadLetters(threadId, 20).then((cached) => {
      if (isMounted) {
        setLetters((prev) => reconcileLettersList(prev, cached));
        setIsLoading(false);
      }
    });

    // 2. Realtime listener for incoming letters in DB5
    const unsubscribe = subscribeToThreadHead(threadId, (freshList) => {
      if (isMounted) {
        setLetters((prev) => reconcileLettersList(prev, freshList));
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
      setLetters((prev) => reconcileLettersList(earlier, prev));
    }

    setIsLoadingEarlier(false);
  };

  const handleReply = () => {
    if (!isDeletedUser) {
      setIsComposerOpen(true);
    }
  };

  const counterpartDisplayName = isDeletedUser
    ? 'Deleted user'
    : (counterpartProfile?.displayName || counterpartProfile?.fullName || (counterpartProfile?.username ? `@${counterpartProfile.username}` : (isLoading ? 'Loading...' : 'Discuss Member')));

  return (
    <div className="fixed inset-0 z-40 w-full h-full flex flex-col bg-neutral-50 dark:bg-black overflow-hidden select-none">
      {/* Dedicated Full-Screen Header */}
      <div className="h-14 px-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Back to letters inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <UserAvatar user={isDeletedUser ? null : counterpartProfile} size="sm" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[180px] sm:max-w-xs">
                  {counterpartDisplayName}
                </span>
                {!isDeletedUser && counterpartProfile && <VerifiedBadge user={counterpartProfile} size="xs" />}
              </div>
              {!isDeletedUser && counterpartProfile?.username && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  @{counterpartProfile.username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side city badge if recipient allows */}
        {counterpartProfile?.letterCityLabel && !isDeletedUser && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
            <MapPin className="w-3.5 h-3.5 text-neutral-500" />
            <span>{counterpartProfile.letterCityLabel}</span>
          </div>
        )}
      </div>

      {/* Letters List / Stack formation with hidden scrollbar */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Load earlier letters button */}
        {hasMoreEarlier && letters.length >= 10 && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleLoadEarlier}
              disabled={isLoadingEarlier}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-200/70 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300/70 dark:hover:bg-neutral-700 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoadingEarlier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>View earlier letters</span>
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            <p className="text-xs text-neutral-400">Unfolding letter correspondence...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              No letters yet
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Start this thread with a handwritten note. Letters take time to travel and build lasting connections.
            </p>
            {!isDeletedUser && (
              <button
                type="button"
                onClick={handleReply}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Write the First Letter</span>
              </button>
            )}
          </div>
        )}

        {/* Letters cards (deduplicated) */}
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

      {/* Bottom Reply Bar */}
      <div className="p-3 sm:p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0">
        {isDeletedUser ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 italic text-center">
            This Discuss account has been deleted. Historical letters are retained in your inbox, but new replies cannot be sent.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleReply}
            className="w-full max-w-md inline-flex items-center justify-center gap-2 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 active:scale-[0.99] text-white dark:text-black text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Reply with a Letter</span>
          </button>
        )}
      </div>

      {/* Composer Modal */}
      {isComposerOpen && (
        <LetterComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          currentUser={currentUser}
          recipient={counterpartProfile || { id: counterpartUid }}
          onLetterSent={(newLetter) => {
            if (newLetter) {
              setLetters((prev) => reconcileLettersList(prev, [newLetter]));
            }
          }}
        />
      )}
    </div>
  );
}
