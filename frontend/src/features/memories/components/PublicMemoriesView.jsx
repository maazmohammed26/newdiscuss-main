import React, { useState, useEffect } from 'react';
import { Globe, Heart, Share2, MapPin, Loader2 } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { formatDisplayDate } from '../utils/dateUtils';
import { getPublicMemories, toggleHeart } from '../data/memoryRepository';
import UserAvatar from '@/components/UserAvatar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * PublicMemoriesView — Quiet, serene community gallery of public memory stamps.
 *
 * Rules:
 * - Quiet aesthetic (not a noisy social feed)
 * - Stamp language preserved
 * - Idempotent hearts
 * - Profile identity navigation
 * - No comments in V1
 */
export default function PublicMemoriesView({
  currentUser,
  onSelectMemory,
  onOpenShare,
}) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const currentUid = currentUser?.uid || currentUser?.id;

  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      setLoading(true);
      try {
        const publicList = await getPublicMemories(20);
        if (mounted) setMemories(publicList || []);
      } catch (err) {
        console.warn('[PublicMemories] Load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProfileClick = (e, ownerId) => {
    e.stopPropagation();
    if (ownerId === currentUid) {
      navigate('/profile');
    } else if (ownerId) {
      navigate(`/user/${ownerId}`);
    }
  };

  const handleHeartClick = async (e, memory) => {
    e.stopPropagation();
    try {
      const res = await toggleHeart(memory.id, currentUser);
      setMemories((prev) =>
        prev.map((item) =>
          item.id === memory.id ? { ...item, heartCount: res.heartCount, hearted: res.hearted } : item
        )
      );
    } catch (_) {}
  };

  const handleNativeShare = async (e, memory) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Discuss Memory Stamp',
          text: memory.caption ? `"${memory.caption}" — Memory Stamp on Discuss` : 'Memory Stamp on Discuss',
          url: window.location.href,
        });
      } catch (_) {}
    } else {
      onOpenShare?.(memory);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-6">
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0095F6]" />
          <span className="text-xs">Gathering public stamps…</span>
        </div>
      ) : memories.length === 0 ? (
        <div className="py-24 px-4 text-center flex flex-col items-center justify-center">
          <Globe className="w-8 h-8 text-neutral-400 mb-2 opacity-50" />
          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            No public memories yet
          </h4>
          <p className="text-xs text-neutral-400 max-w-xs mt-1">
            When users preserve memories with Public visibility, their stamps will appear in this calm community gallery.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4 px-2">
          {memories.map((mem) => (
            <div
              key={mem.id}
              onClick={() => onSelectMemory?.(mem)}
              className="w-full bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-3.5 shadow-xs cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-2.5"
            >
              {/* Creator Profile Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handleProfileClick(e, mem.ownerId)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800">
                    <UserAvatar
                      userId={mem.ownerId}
                      username={mem.ownerUsername || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                      {mem.ownerUsername || (mem.ownerId === currentUid ? 'You' : 'Discuss User')}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {formatDisplayDate(mem.memoryDate)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1">
                  {/* Heart Action */}
                  <button
                    type="button"
                    onClick={(e) => handleHeartClick(e, mem)}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-[#ED4956] p-1.5 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        mem.hearted ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-400'
                      }`}
                    />
                    {mem.heartCount > 0 && <span>{mem.heartCount}</span>}
                  </button>

                  {/* Share Action */}
                  <button
                    type="button"
                    onClick={(e) => handleNativeShare(e, mem)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Central Stamp */}
              <div className="w-full flex items-center justify-center py-1">
                <MemoryStamp
                  memory={mem}
                  variant={STAMP_VARIANTS.PUBLIC}
                  alt={mem.caption || 'Public memory stamp'}
                />
              </div>

              {/* Caption & Location */}
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
          ))}
        </div>
      )}
    </div>
  );
}
