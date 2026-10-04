import React, { useState, useEffect } from 'react';
import { Search, X, Users, UserCheck, Mail } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getFriends, searchUsers } from '@/lib/relationshipsDb';
import { getUserProfile } from '@/lib/userProfileDb';
import { checkPendingNonFriendLetter } from '../data/letterRepository';
import { toast } from 'sonner';

export default function LetterRecipientSearch({
  isOpen,
  onClose,
  currentUserId,
  onSelectRecipient,
}) {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [, setIsSearchingNonFriends] = useState(false);

  // 1. Fetch user's friends first (instant local/bounded list)
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let isMounted = true;
    setIsLoadingFriends(true);

    getFriends(currentUserId, true)
      .then(async (friendsList) => {
        if (!isMounted) return;
        const detailed = await Promise.all(
          friendsList.slice(0, 40).map(async (f) => {
            const prof = await getUserProfile(f.id).catch(() => null);
            return {
              id: f.id,
              ...prof,
              displayName: prof?.displayName || prof?.fullName || f.username || 'Friend',
              username: prof?.username || f.username,
              isFriend: true,
            };
          })
        );
        if (isMounted) {
          setFriends(detailed);
          setIsLoadingFriends(false);
        }
      })
      .catch((err) => {
        console.warn('[LetterRecipientSearch] Friends load error:', err);
        if (isMounted) setIsLoadingFriends(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUserId]);

  // 2. Query filter on friends (local) & bounded non-friends search
  useEffect(() => {
    if (!query.trim() || !currentUserId) {
      setSearchResults([]);
      return;
    }

    const trimmed = query.trim().toLowerCase();
    const friendMatches = friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(trimmed) ||
        f.displayName?.toLowerCase().includes(trimmed)
    );

    setSearchResults(friendMatches);

    if (trimmed.length >= 2) {
      setIsSearchingNonFriends(true);
      const timer = setTimeout(() => {
        searchUsers(trimmed, currentUserId)
          .then((users) => {
            const existingIds = new Set(friendMatches.map((f) => f.id));
            const newUsers = users
              .filter((u) => !existingIds.has(u.id))
              .map((u) => ({
                id: u.id,
                ...u,
                displayName: u.displayName || u.fullName || u.username,
                isFriend: false,
              }));
            setSearchResults([...friendMatches, ...newUsers]);
          })
          .catch((err) => console.warn('[LetterRecipientSearch] Search error:', err))
          .finally(() => setIsSearchingNonFriends(false));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [query, friends, currentUserId]);

  if (!isOpen) return null;

  const displayList = query.trim() ? searchResults : friends;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-recipient-search-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 id="letter-recipient-search-title" className="text-sm font-semibold text-neutral-900 dark:text-white">
                Send a Letter
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose a friend or non-friend member
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List of candidates with hidden scrollbar */}
        <div 
          className="flex-1 overflow-y-auto p-3 space-y-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {!query.trim() && (
            <div className="px-2 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Friends ({friends.length})</span>
            </div>
          )}

          {displayList.map((user) => (
            <button
              key={user.id}
              onClick={async () => {
                if (!user.isFriend && currentUserId) {
                  const isPending = await checkPendingNonFriendLetter(currentUserId, user.id);
                  if (isPending) {
                    toast.info("You've already sent a Letter.", {
                      description: "Wait for them to open it before sending another.",
                    });
                    onClose();
                    return;
                  }
                }
                onSelectRecipient(user);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <UserAvatar user={user} size={40} className="w-full h-full" interactive={false} fit="cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                      {user.displayName || user.username || 'Member'}
                    </span>
                    <VerifiedBadge user={user} size="xs" />
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    @{user.username || 'user'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {user.isFriend ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <UserCheck className="w-3 h-3" />
                    Friend
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    Non-friend
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Empty state */}
          {displayList.length === 0 && !isLoadingFriends && (
            <div className="py-12 text-center">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {query.trim()
                  ? `No members found matching "${query}"`
                  : 'Add friends to start exchanging letters'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
