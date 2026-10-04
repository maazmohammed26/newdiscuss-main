import React, { useState, useEffect } from 'react';
import { Inbox, Send, Loader2, Heart, Share2, MapPin } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { formatDisplayDate } from '../utils/dateUtils';
import { getSharedReceivedMemories, getSharedSentMemories, toggleHeart } from '../data/memoryRepository';
import UserAvatar from '@/components/UserAvatar';
import { useNavigate } from 'react-router-dom';

/**
 * SharedMemoriesView — Displays Received and Sent shared memory stamps.
 *
 * Rules:
 * - Tabs: Received / Sent
 * - Preserves postage stamp identity
 * - Clicking owner profile opens their Discuss profile
 * - Supports heart interaction
 */
export default function SharedMemoriesView({
  currentUser,
  onSelectMemory,
}) {
  const [subTab, setSubTab] = useState('received'); // 'received' | 'sent'
  const [receivedMemories, setReceivedMemories] = useState([]);
  const [sentMemories, setSentMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const userId = currentUser?.uid || currentUser?.id;

  useEffect(() => {
    let mounted = true;
    async function loadShared() {
      if (!userId) return;
      setLoading(true);
      try {
        const [recv, sent] = await Promise.all([
          getSharedReceivedMemories(userId),
          getSharedSentMemories(userId),
        ]);
        if (mounted) {
          setReceivedMemories(recv || []);
          setSentMemories(sent || []);
        }
      } catch (err) {
        console.warn('[SharedMemories] Failed to load:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadShared();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const activeList = subTab === 'received' ? receivedMemories : sentMemories;

  const handleProfileClick = (e, ownerId) => {
    e.stopPropagation();
    if (ownerId === userId) {
      navigate('/profile');
    } else if (ownerId) {
      navigate(`/user/${ownerId}`);
    }
  };

  const handleHeartClick = async (e, memory) => {
    e.stopPropagation();
    try {
      const res = await toggleHeart(memory.id, currentUser);
      setReceivedMemories((prev) =>
        prev.map((item) =>
          item.id === memory.id ? { ...item, heartCount: res.heartCount, hearted: res.hearted } : item
        )
      );
    } catch (_) {}
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-6">
      {/* Subtab Toggle: Received vs Sent */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl mb-4 border border-neutral-200/60 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setSubTab('received')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'received'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Received</span>
          {receivedMemories.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold">
              {receivedMemories.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('sent')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'sent'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Sent</span>
          {sentMemories.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-700 font-bold">
              {sentMemories.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0095F6]" />
          <span className="text-xs">Loading shared memories…</span>
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
          {subTab === 'received' ? (
            <>
              <Inbox className="w-8 h-8 text-neutral-400 mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                No shared memories received yet
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                When Discuss friends privately share their captured memory stamps with you, they will appear here.
              </p>
            </>
          ) : (
            <>
              <Send className="w-8 h-8 text-neutral-400 mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                You haven't shared any memories yet
              </h4>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                Open any private memory stamp and tap Share to send it directly to Discuss users.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4 px-2">
          {activeList.map((mem) => {
            const ownerId = mem.ownerId || mem.senderId;

            return (
              <div
                key={mem.id || mem.memoryId}
                onClick={() => onSelectMemory?.(mem)}
                className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3.5 shadow-xs cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-2.5"
              >
                {/* Header: Sender/Recipient Profile */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => handleProfileClick(e, ownerId)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
                      <UserAvatar
                        userId={ownerId}
                        username={mem.ownerUsername || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left leading-tight">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                        {mem.ownerUsername || (ownerId === userId ? 'You' : 'Discuss User')}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {formatDisplayDate(mem.memoryDate)}
                      </span>
                    </div>
                  </button>

                  {/* Heart Action */}
                  <button
                    type="button"
                    onClick={(e) => handleHeartClick(e, mem)}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-[#ED4956] p-1"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        mem.hearted ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-400'
                      }`}
                    />
                    {mem.heartCount > 0 && <span>{mem.heartCount}</span>}
                  </button>
                </div>

                {/* Central Memory Stamp */}
                <div className="w-full flex items-center justify-center py-1">
                  <MemoryStamp
                    memory={mem}
                    variant={STAMP_VARIANTS.SHARED}
                    alt={mem.caption || 'Shared memory'}
                  />
                </div>

                {/* Caption / Location Footer */}
                {mem.caption && (
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 px-1 font-normal line-clamp-2">
                    {mem.caption}
                  </p>
                )}

                {mem.location && (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 px-1">
                    <MapPin className="w-3 h-3 text-[#ED4956]" />
                    <span className="truncate">{mem.location}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
