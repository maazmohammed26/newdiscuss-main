import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Send, Loader2, Users, UserCheck } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { searchUsers } from '@/lib/relationshipsDb';
import { shareMemory, getMemoryShares } from '../data/memoryRepository';
import { toast } from 'sonner';

/**
 * MemoryShareModal — Share private memory with selected Discuss users.
 *
 * Rules:
 * - Load previously shared recipients on open
 * - Allow checking/unchecking recipients to share/unshare
 * - Display existing recipients with checkmarks
 * - Provide clear, prominent, sticky "Save" button
 * - Support unsharing with all users
 */
export default function MemoryShareModal({
  memory,
  open,
  onClose,
  currentUser,
  onSharedUpdated,
}) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialRecipients, setInitialRecipients] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUid = currentUser?.uid || currentUser?.id;

  // Load existing shares whenever modal opens for a memory
  useEffect(() => {
    let mounted = true;
    if (open && memory?.id) {
      setSearchQuery('');
      setSearchResults([]);
      setSearching(false);
      setSaving(false);
      setLoadingExisting(true);

      getMemoryShares(memory.id, currentUser)
        .then((existing) => {
          if (!mounted) return;
          const list = Array.isArray(existing) ? existing : [];
          setSelectedUsers(list);
          setInitialRecipients(list);
        })
        .catch((err) => {
          console.warn('[MemoryShare] Failed to load existing shares:', err);
          if (mounted) {
            setSelectedUsers([]);
            setInitialRecipients([]);
          }
        })
        .finally(() => {
          if (mounted) setLoadingExisting(false);
        });
    }

    return () => {
      mounted = false;
    };
  }, [open, memory?.id, currentUser]);

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

  // Track if selections changed compared to initial load
  const isDirty = useMemo(() => {
    const initialSet = new Set(initialRecipients.map((u) => u.id || u.uid));
    const currentSet = new Set(selectedUsers.map((u) => u.id || u.uid));
    if (initialSet.size !== currentSet.size) return true;
    for (const uid of currentSet) {
      if (!initialSet.has(uid)) return true;
    }
    return false;
  }, [initialRecipients, selectedUsers]);

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

  const handleSaveShare = async () => {
    setSaving(true);
    try {
      const recipientUids = selectedUsers.map((u) => u.id || u.uid);
      const yearMonth = memory.yearMonth || memory.memoryDate?.slice(0, 7);

      await shareMemory(memory.id, yearMonth, recipientUids, currentUser);

      if (recipientUids.length === 0) {
        toast.success('Memory unshared with all users.');
      } else {
        toast.success(
          `Memory shared with ${recipientUids.length} ${
            recipientUids.length === 1 ? 'person' : 'people'
          }.`
        );
      }

      onSharedUpdated?.(memory.id, recipientUids);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update sharing.');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center select-none bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share Memory Stamp"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#141414] border-t sm:border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span>Share Memory Stamp</span>
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Select Discuss users to privately share this stamp with
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="shrink-0 px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or name…"
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Users Pill Chips */}
        {selectedUsers.length > 0 && (
          <div
            className="shrink-0 px-5 py-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {selectedUsers.map((u) => {
              const uid = u.id || u.uid;
              return (
                <div
                  key={uid}
                  className="pl-2 pr-1.5 py-1 rounded-full bg-[#0095F6]/10 text-[#0095F6] border border-[#0095F6]/20 text-xs font-semibold flex items-center gap-1.5"
                >
                  <span className="max-w-[120px] truncate">@{u.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(u)}
                    className="p-0.5 rounded-full hover:bg-[#0095F6]/20 transition-colors"
                    title={`Remove @${u.username}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Body with hidden scrollbars */}
        <div
          className="flex-1 overflow-y-auto px-5 py-2 min-h-0 scrollbar-hide scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loadingExisting ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0095F6]" />
              <span>Loading current shares…</span>
            </div>
          ) : searching ? (
            <div className="py-10 flex items-center justify-center text-neutral-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />
              <span>Searching users…</span>
            </div>
          ) : searchQuery.trim().length >= 2 ? (
            /* Search Results */
            searchResults.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                <div className="pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Search Results
                </div>
                {searchResults.map((u) => {
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
                            {u.name || u.full_name || u.displayName || u.username}
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
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-neutral-400">
                No Discuss users found matching "{searchQuery}".
              </div>
            )
          ) : (
            /* Current / Shared Users List */
            <div>
              {selectedUsers.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between pb-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    <span>Shared With ({selectedUsers.length})</span>
                    <span className="text-[10px] text-neutral-400 lowercase font-normal">
                      tap tick to unshare
                    </span>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {selectedUsers.map((u) => {
                      const uid = u.id || u.uid;
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
                                {u.name || u.full_name || u.displayName || u.username}
                              </span>
                              <span className="text-[11px] text-neutral-400 block truncate">
                                @{u.username}
                              </span>
                            </div>
                          </div>

                          {/* Checked Tick Mark Indicator */}
                          <div className="w-5 h-5 rounded-full border border-[#0095F6] bg-[#0095F6] text-white flex items-center justify-center transition-all shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                  <Users className="w-8 h-8 text-neutral-400 mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Not shared with anyone yet
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-[220px] mt-1">
                    Search Discuss users above by name or username to privately share this stamp.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer - Always visible, never covered by FloatingNavbar, safe-area padded on mobile */}
        <div className="shrink-0 bg-white dark:bg-[#141414] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2.5 z-20">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveShare}
            disabled={saving || (!isDirty && initialRecipients.length === selectedUsers.length && selectedUsers.length === 0)}
            className="flex-1 py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving…</span>
              </>
            ) : selectedUsers.length === 0 && initialRecipients.length > 0 ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Unshare All & Save</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save ({selectedUsers.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return mounted && typeof document !== 'undefined' && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}
