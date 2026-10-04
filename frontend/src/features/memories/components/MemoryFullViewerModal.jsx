import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Trash2, Heart, MapPin, Calendar, User, Loader2, Globe, Lock } from 'lucide-react';
import MemoryStamp from './MemoryStamp';
import { STAMP_VARIANTS } from '../utils/stampTheme';
import { formatDisplayDate } from '../utils/dateUtils';
import { deleteMemory, downloadMemory, toggleHeart, updateMemoryVisibility } from '../data/memoryRepository';
import UserAvatar from '@/components/UserAvatar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * MemoryFullViewerModal — Full-screen postage stamp viewer.
 *
 * Rules:
 * - Fits entirely within viewport without overflow
 * - Postage stamp frame remains visibly distinct
 * - Owner-only download action (completely hidden for other users)
 * - Owner delete action with confirmation dialog
 * - Preserves back-navigation context
 */
export default function MemoryFullViewerModal({
  memory,
  open,
  onClose,
  currentUser,
  onDeleted,
  onOpenShare,
  onVisibilityChanged,
}) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [heartCount, setHeartCount] = useState(memory?.heartCount || 0);
  const [visibility, setVisibility] = useState(memory?.visibility || 'private');
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  useEffect(() => {
    if (memory) {
      setVisibility(memory.visibility || 'private');
      setHeartCount(memory.heartCount || 0);
    }
  }, [memory]);

  if (!open || !memory) return null;

  const currentUid = currentUser?.uid || currentUser?.id;
  const isOwner = Boolean(currentUid && (memory.ownerId === currentUid || memory.userId === currentUid));

  const handleDelete = async () => {
    if (!isOwner) return;
    setDeleting(true);
    try {
      const yearMonth = memory.yearMonth || memory.memoryDate?.slice(0, 7);
      await deleteMemory(memory.id, yearMonth, currentUser);
      toast.success('Memory deleted.');
      onDeleted?.(memory.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to delete memory.');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleDownload = async () => {
    if (!isOwner) return;
    setDownloading(true);
    try {
      const yearMonth = memory.yearMonth || memory.memoryDate?.slice(0, 7);
      await downloadMemory(memory.id, yearMonth, currentUser);
      toast.success('Memory downloaded.');
    } catch (err) {
      toast.error(err.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!isOwner || updatingVisibility) return;
    const nextVis = visibility === 'public' ? 'private' : 'public';
    setUpdatingVisibility(true);
    try {
      const yearMonth = memory.yearMonth || memory.memoryDate?.slice(0, 7);
      const updated = await updateMemoryVisibility(memory.id, yearMonth, nextVis, currentUser);
      setVisibility(nextVis);
      toast.success(
        nextVis === 'public'
          ? 'Memory is now Public (visible in Public gallery).'
          : 'Memory is now Private.'
      );
      onVisibilityChanged?.({ ...memory, visibility: nextVis });
    } catch (err) {
      toast.error(err.message || 'Failed to update visibility.');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleHeartToggle = async () => {
    try {
      const res = await toggleHeart(memory.id, currentUser);
      setHearted(res.hearted);
      setHeartCount(res.heartCount);
    } catch (e) {
      // optimistic toggle fallback
      setHearted((prev) => !prev);
      setHeartCount((c) => (hearted ? Math.max(0, c - 1) : c + 1));
    }
  };

  const handleProfileClick = () => {
    const ownerId = memory.ownerId || memory.userId;
    if (ownerId === currentUid) {
      navigate('/profile');
    } else if (ownerId) {
      navigate(`/user/${ownerId}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="View Memory Stamp"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full max-h-[96vh] flex flex-col items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Controls */}
        <div className="w-full flex items-center justify-between text-white/80 py-2 px-1">
          {/* Owner profile badge */}
          <button
            type="button"
            onClick={handleProfileClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
              <UserAvatar
                userId={memory.ownerId || memory.userId}
                username={memory.ownerUsername || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="leading-tight">
              <span className="text-xs font-semibold text-white block">
                {memory.ownerUsername || (isOwner ? 'You' : 'Discuss User')}
              </span>
              <span className="text-[10px] text-white/60 block">
                {formatDisplayDate(memory.memoryDate)}
              </span>
            </div>
          </button>

          {/* Visibility pill and close button */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                visibility === 'public'
                  ? 'text-sky-400 bg-sky-950/60 border-sky-800/40'
                  : 'text-neutral-400 bg-neutral-800/60 border-neutral-700/40'
              }`}
            >
              {visibility === 'public' ? (
                <>
                  <Globe className="w-2.5 h-2.5" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>Private</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Stamp Display */}
        <div className="w-full flex items-center justify-center my-auto py-2">
          <MemoryStamp
            memory={memory}
            variant={STAMP_VARIANTS.VIEWER}
            priority
            alt={memory.caption || 'Memory stamp'}
          />
        </div>

        {/* Bottom Card: Metadata & Actions */}
        <div className="w-full max-w-sm bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-white shadow-xl mt-2">
          {/* Caption */}
          {memory.caption && (
            <p className="text-xs sm:text-sm text-neutral-200 mb-1 text-center font-normal px-2">
              "{memory.caption}"
            </p>
          )}

          {/* Location */}
          {memory.location && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 mb-2">
              <MapPin className="w-3 h-3 text-[#ED4956]" />
              <span>{memory.location}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-around pt-2 border-t border-white/10">
            {/* Heart action (for shared/public or owner) */}
            <button
              type="button"
              onClick={handleHeartToggle}
              className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-[#ED4956] transition-colors p-1.5 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  hearted ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-300'
                }`}
              />
              {heartCount > 0 && <span>{heartCount}</span>}
            </button>

            {/* Owner Visibility Toggle Action */}
            {isOwner && (
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={updatingVisibility}
                title={visibility === 'public' ? 'Make private' : 'Make public'}
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white transition-colors p-1.5 cursor-pointer"
              >
                {updatingVisibility ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                ) : visibility === 'public' ? (
                  <Globe className="w-4 h-4 text-sky-400" />
                ) : (
                  <Lock className="w-4 h-4 text-neutral-400" />
                )}
                <span className="hidden sm:inline">
                  {visibility === 'public' ? 'Make Private' : 'Make Public'}
                </span>
              </button>
            )}

            {/* Owner Share Action */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShare?.(memory);
                }}
                title="Share privately"
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white transition-colors p-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Owner Download Action (STRICTLY HIDDEN FOR OTHER USERS) */}
            {isOwner && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                title="Download high quality stamp"
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white transition-colors p-1.5 cursor-pointer"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            {/* Owner Delete Action */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                title="Delete memory"
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors p-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Alert */}
        {confirmDelete && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="max-w-xs w-full bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 text-center shadow-2xl">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1.5">
                Delete Memory Stamp?
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                This will permanently delete this captured stamp, its cloud storage, and remove it from anyone you shared it with.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
