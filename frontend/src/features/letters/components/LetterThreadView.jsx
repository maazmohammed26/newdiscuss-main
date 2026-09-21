import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Send, MapPin, Mail, ChevronUp } from 'lucide-react';
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
 * Reconciles local and realtime letters by clientMutationId and canonical id,
 * guaranteeing exactly one copy of each letter is rendered.
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
      continue; // Purge orphan optimistic copy
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
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [showPaperSkeleton, setShowPaperSkeleton] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [hasMoreEarlier, setHasMoreEarlier] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Pagination: initially display latest 3 letters per PRD Section 12
  const [visibleCount, setVisibleCount] = useState(3);
  const skeletonTimerRef = useRef(null);

  // Fetch counterpart profile with deleted-user safety and cached fallback
  useEffect(() => {
    if (!counterpartUid) return;
    let isMounted = true;

    // Fast local profile cache first
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
          // Absent in canonical DB
          setCounterpartProfile({ isDeleted: true });
        }
      } catch (err) {
        // Transient network or server 503 failure — DO NOT mark as deleted!
        console.warn(`[LetterThreadView] Transient profile load notice for ${counterpartUid}:`, err?.message);
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
    setIsLoadingLetters(true);

    // 140ms delayed skeleton reveal for thread: prevents flash for fast local reads
    setShowPaperSkeleton(false);
    if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    skeletonTimerRef.current = setTimeout(() => {
      setShowPaperSkeleton(true);
    }, 140);

    // 1. Read fast local cached letters (initial window 20)
    getThreadLetters(threadId, 20).then((cached) => {
      if (!isMounted) return;
      if (cached && cached.length > 0) {
        if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
        setShowPaperSkeleton(false);
        setLetters((prev) => reconcileLettersList(prev, cached));
        setIsLoadingLetters(false);
        if (cached.length > 3) setHasMoreEarlier(true);
      }
    });

    // 2. Realtime listener for incoming letters in DB5
    const unsubscribe = subscribeToThreadHead(threadId, (freshList) => {
      if (!isMounted) return;
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      setShowPaperSkeleton(false);
      setLetters((prev) => {
        const next = reconcileLettersList(prev, freshList);
        if (next.length > visibleCount) {
          setHasMoreEarlier(true);
        }
        return next;
      });
      setIsLoadingLetters(false);
    });

    return () => {
      isMounted = false;
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      unsubscribe();
    };
  }, [threadId, visibleCount]);

  // Load earlier letters
  const handleLoadEarlier = async () => {
    if (!letters.length || isLoadingEarlier) return;
    
    // First expand local view window if letters already loaded locally
    if (letters.length > visibleCount) {
      setVisibleCount((prev) => Math.min(prev + 5, letters.length));
      if (visibleCount + 5 >= letters.length) {
        setHasMoreEarlier(false);
      }
      return;
    }

    setIsLoadingEarlier(true);
    const oldestCreatedAt = letters[0]?.createdAt;
    const earlier = await fetchEarlierLetters(threadId, oldestCreatedAt, 10);

    if (!earlier.length) {
      setHasMoreEarlier(false);
    } else {
      setLetters((prev) => reconcileLettersList(earlier, prev));
      setVisibleCount((prev) => prev + earlier.length);
    }

    setIsLoadingEarlier(false);
  };

  const handleReply = () => {
    if (!isDeletedUser) {
      setIsComposerOpen(true);
    }
  };

  const counterpartDisplayName = isDeletedUser
    ? 'Account removed'
    : (counterpartProfile?.displayName || counterpartProfile?.fullName || (counterpartProfile?.username ? `@${counterpartProfile.username}` : (isLoadingLetters ? 'Loading...' : 'Discuss Member')));

  const counterpartHandle = (!isDeletedUser && counterpartProfile?.username) ? `@${counterpartProfile.username}` : '';

  // Bounded visible letters: latest `visibleCount` letters
  const displayedLetters = useMemo(() => {
    return letters.slice(-visibleCount);
  }, [letters, visibleCount]);

  const shouldRenderPaperSkeleton = isLoadingLetters && letters.length === 0 && showPaperSkeleton;

  return (
    <div className="fixed inset-0 z-50 w-full h-full flex flex-col bg-neutral-50 dark:bg-black overflow-hidden select-none">
      {/* Dedicated Full-Screen Header (PRD Section 12) */}
      <div className="h-14 px-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Back to letters inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* 40px avatar + user identifiers */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <UserAvatar user={isDeletedUser ? null : counterpartProfile} size="sm" className="w-10 h-10 rounded-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[170px] sm:max-w-xs">
                  {counterpartDisplayName}
                </span>
                {!isDeletedUser && counterpartProfile && <VerifiedBadge user={counterpartProfile} size="xs" />}
              </div>
              {counterpartHandle && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {counterpartHandle}
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

      {/* Letters List / Stack formation with hidden scrollbars */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        aria-busy={isLoadingLetters}
      >
        {/* Load earlier letters button */}
        {(hasMoreEarlier || letters.length > visibleCount) && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={handleLoadEarlier}
              disabled={isLoadingEarlier}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300/70 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>View earlier letters</span>
            </button>
          </div>
        )}

        {/* Paper-shaped Skeleton for Thread (PRD Section 5) */}
        {shouldRenderPaperSkeleton && (
          <div
            className="w-full max-w-lg mx-auto bg-[#fcfaf4] dark:bg-[#1c1a17] rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs p-5 space-y-4 animate-in fade-in duration-200"
            aria-hidden="true"
          >
            {/* Header line skeleton */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-200/60 dark:bg-neutral-800/70 animate-pulse" />
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 bg-neutral-200/60 dark:bg-neutral-800/70 rounded animate-pulse" />
                <div className="w-16 h-2.5 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse" />
              </div>
            </div>

            {/* Handwritten line skeletons */}
            <div className="py-4 space-y-3">
              <div className="w-[88%] h-3.5 bg-neutral-200/50 dark:bg-neutral-800/60 rounded animate-pulse" />
              <div className="w-[68%] h-3.5 bg-neutral-200/50 dark:bg-neutral-800/60 rounded animate-pulse" />
              <div className="w-[78%] h-3.5 bg-neutral-200/50 dark:bg-neutral-800/60 rounded animate-pulse" />
            </div>

            {/* Footer skeleton */}
            <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/70 flex justify-between">
              <div className="w-20 h-2.5 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse" />
            </div>
          </div>
        )}

        {/* True Empty state: only when not loading and zero letters */}
        {!isLoadingLetters && letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-200">
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

        {/* Letters cards (deduplicated) with smooth fade-in dissolve */}
        {displayedLetters.map((letter, idx) => {
          const isLatest = idx === displayedLetters.length - 1;
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
      <div className="p-3 sm:p-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-center shrink-0">
        {isDeletedUser ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 italic text-center">
            This Discuss account has been removed. Historical letters are retained in your inbox, but new replies cannot be sent.
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

      {/* Full-screen Composer Modal (PRD Section 34) */}
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
