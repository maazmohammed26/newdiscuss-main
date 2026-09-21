import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Users, Sparkles, UserCheck, MapPin } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getFriends, searchUsers } from '@/lib/relationshipsDb';
import { getUserProfile } from '@/lib/userProfileDb';

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
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);

  // 1. Fetch user's friends first (instant local/bounded list)
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let isMounted = true;
    setIsLoadingFriends(true);

    getFriends(currentUserId, true)
      .then(async (friendsList) => {
        if (!isMounted) return;
        // Resolve profile details for friends
        const detailed = await Promise.all(
          friendsList.slice(0, 40).map(async (f) => {
            const prof = await getUserProfile(f.id);
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

  // 2. Query filter on friends (local) & bounded community search
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

    // If matches found among friends, show them
    setSearchResults(friendMatches);

    // If query has at least 2 chars, run bounded community search
    if (trimmed.length >= 2) {
      setIsSearchingCommunity(true);
      const timer = setTimeout(() => {
        searchUsers(trimmed, currentUserId)
          .then((users) => {
            // Deduplicate with friends already found
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
          .finally(() => setIsSearchingCommunity(false));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [query, friends, currentUserId]);

  if (!isOpen) return null;

  const displayList = query.trim() ? searchResults : friends;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-recipient-search-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="letter-recipient-search-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Send a Letter
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose a friend or community member
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-amber-500 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List of candidates */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {!query.trim() && (
            <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Friends ({friends.length})</span>
            </div>
          )}

          {displayList.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onSelectRecipient(user);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-500/10 dark:hover:bg-amber-500/10 text-left transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar user={user} size="md" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {user.displayName || user.username || 'Member'}
                    </span>
                    <VerifiedBadge user={user} size="xs" />
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    @{user.username || 'user'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {user.isFriend ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <UserCheck className="w-3 h-3" />
                    Friend
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    Community
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Empty state */}
          {displayList.length === 0 && !isLoadingFriends && (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
