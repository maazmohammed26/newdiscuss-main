import React, { useState, useEffect } from 'react';
import { X, Search, Check, Send, Loader2, User } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { searchUsers } from '@/lib/relationshipsDb';
import { shareMemory } from '../data/memoryRepository';
import { toast } from 'sonner';

/**
 * MemoryShareModal — Share private memory with selected Discuss users.
 *
 * Rules:
 * - Search eligible Discuss users (friends & non-friends)
 * - Select one or multiple recipients
 * - Lightweight share references (no image duplication)
 */
export default function MemoryShareModal({
  memory,
  open,
  onClose,
  currentUser,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);

  const currentUid = currentUser?.uid || currentUser?.id;

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setSearching(false);
      setSharing(false);
    }
  }, [open]);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim(), currentUid);
        setSearchResults(results || []);
      } catch (err) {
        console.warn('[MemoryShare] Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUid]);

  if (!open || !memory) return null;

  const toggleSelectUser = (u) => {
    const uid = u.id || u.uid;
    setSelectedUsers((prev) => {
      const exists = prev.some((item) => (item.id || item.uid) === uid);
      if (exists) {
        return prev.filter((item) => (item.id || item.uid) !== uid);
      } else {
        return [...prev, u];
      }
    });
  };

  const handleSendShare = async () => {
    if (selectedUsers.length === 0) return;

    setSharing(true);
    try {
      const recipientUids = selectedUsers.map((u) => u.id || u.uid);
      const yearMonth = memory.yearMonth || memory.memoryDate?.slice(0, 7);

      await shareMemory(memory.id, yearMonth, recipientUids, currentUser);

      toast.success(
        `Memory shared with ${selectedUsers.length} ${
          selectedUsers.length === 1 ? 'person' : 'people'
        }.`
      );
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to share memory.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center select-none bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share Memory"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#141414] border-t sm:border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Share Memory Stamp
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Select Discuss users to privately share this stamp with
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sharing}
            aria-label="Close"
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or name…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
            />
          </div>
        </div>

        {/* Selected Users Pill Bar */}
        {selectedUsers.length > 0 && (
          <div className="px-5 py-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {selectedUsers.map((u) => {
              const uid = u.id || u.uid;
              return (
                <div
                  key={uid}
                  className="pl-2 pr-1.5 py-1 rounded-full bg-[#0095F6]/10 text-[#0095F6] border border-[#0095F6]/20 text-xs font-semibold flex items-center gap-1"
                >
                  <span className="max-w-[120px] truncate">@{u.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(u)}
                    className="p-0.5 rounded-full hover:bg-[#0095F6]/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-neutral-100 dark:divide-neutral-800/60 min-h-[160px]">
          {searching ? (
            <div className="py-8 flex items-center justify-center text-neutral-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />
              <span>Searching users…</span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((u) => {
              const uid = u.id || u.uid;
              const isSelected = selectedUsers.some((item) => (item.id || item.uid) === uid);

              return (
                <div
                  key={uid}
                  onClick={() => toggleSelectUser(u)}
                  className="py-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/60 rounded-xl px-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 shrink-0">
                      <UserAvatar
                        userId={uid}
                        username={u.username || 'User'}
                        src={u.photo_url || u.photoURL}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block truncate">
                        {u.name || u.full_name || u.username}
                      </span>
                      <span className="text-[11px] text-neutral-400 block truncate">
                        @{u.username}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-[#0095F6] bg-[#0095F6] text-white'
                        : 'border-neutral-300 dark:border-neutral-700 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          ) : searchQuery.trim().length >= 2 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No Discuss users found matching "{searchQuery}".
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-400">
              Type at least 2 characters to search Discuss users.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sharing}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSendShare}
            disabled={sharing || selectedUsers.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {sharing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sharing…</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Share with {selectedUsers.length || ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
