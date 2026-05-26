/**
 * UserAvatar.js — Shared avatar image component
 *
 * Fixes the "profile pic broken on deployment, works on localhost" issue:
 *  Suppress Referer header so Google's CDN accepts the request.
 *  Fallback: Shows initials.
 *
 * Upgraded features:
 *  1. Story Portal Rings: Conic shining border for users with active stories.
 *  2. Glassmorphic Option Interceptors: full story viewing, full profile pic previewing, and profile routing.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import SignalStoryViewer from '@/components/SignalStoryViewer';
import { Zap, User as UserIcon, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * @param {string}  src          — image URL (photo_url / photoURL)
 * @param {string}  username     — used to generate the initials fallback
 * @param {string}  [className]  — additional CSS classes (e.g. "w-9 h-9")
 * @param {string}  [alt]        — alt text (defaults to username)
 * @param {string}  [fallbackBg] — CSS background for the initials avatar
 * @param {string}  [userId]     — if provided, integrates active story rings & popovers
 */
export default function UserAvatar({
  src,
  username = '?',
  className = 'w-9 h-9',
  alt,
  fallbackBg = 'linear-gradient(135deg, #2563EB, #1d4ed8)',
  style = {},
  userId,
}) {
  const { user: currentUser } = useAuth();
  const highlights = useHighlights();
  const navigate = useNavigate();
  const location = useLocation();

  const [failed, setFailed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const altText = alt || username || 'User';

  // Derive initials: up to 2 alphanumeric characters from the username
  const raw = username ? username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() : '';
  const initials = raw.length > 0 ? raw : '?';

  // Safe checks for story presence
  const usersWithStories = highlights?.usersWithStories || new Set();
  const storyGroups = highlights?.storyGroups || [];
  const seenStoryIds = highlights?.seenStoryIds || new Set();

  const isSelf = currentUser && userId && userId === currentUser.id;
  const hasStory = userId && usersWithStories.has(userId);

  const targetGroupIdx = userId ? storyGroups.findIndex((g) => g.authorId === userId) : -1;
  const isOnProfilePage = userId && location.pathname === `/user/${userId}`;

  const handleAvatarClick = (e) => {
    if (!currentUser) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // If own avatar or no userId provided, let standard click propagation do its job
    if (isSelf || !userId) return;

    e.preventDefault();
    e.stopPropagation();

    if (hasStory) {
      setShowOptions(true);
    } else {
      if (src && !failed) {
        setShowImagePreview(true);
      }
    }
  };

  const innerAvatarMarkup = src && !failed ? (
    <img
      src={src}
      alt={altText}
      className={`${className} rounded-full object-cover flex-shrink-0 story-shining-avatar no-drag ${!currentUser ? 'grayscale opacity-60 pointer-events-none' : ''}`}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.error("Action restricted by security policy.");
      }}
      onDragStart={(e) => {
        e.preventDefault();
      }}
    />
  ) : (
    <div
      className={`${className} rounded-full flex items-center justify-center flex-shrink-0 select-none font-semibold text-white story-shining-avatar ${!currentUser ? 'grayscale opacity-60 pointer-events-none' : ''}`}
      style={{ background: fallbackBg, ...style }}
      aria-label={altText}
      role="img"
    >
      <span style={{ fontSize: 'clamp(10px, 40%, 18px)', lineHeight: 1 }}>
        {initials}
      </span>
    </div>
  );

  // Fallback to pure avatar markup for ourselves or if no user ID is provided
  if (isSelf || !userId) {
    return innerAvatarMarkup;
  }

  return (
    <div 
      className="relative inline-flex items-center justify-center flex-shrink-0 cursor-pointer"
      onClick={handleAvatarClick}
    >
      {hasStory && <div className="story-shining-portal-ring" />}
      {innerAvatarMarkup}

      {/* Premium Glassmorphic Popover Modal */}
      {showOptions && createPortal(
        <div 
          onClick={() => setShowOptions(false)}
          className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[280px] p-5 bg-white/95 dark:bg-[#1E293B]/95 discuss:bg-[#1a1a1a]/95 border border-neutral-200 dark:border-white/10 discuss:border-[#333333] rounded-2xl shadow-2xl backdrop-blur-2xl"
          >
            {/* Header row with Title and Close X Button */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-200/50 dark:border-white/10 discuss:border-[#333333]">
              <span className="text-xs font-extrabold tracking-tight text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5]">
                @{username}
              </span>
              <button 
                onClick={() => setShowOptions(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 discuss:hover:bg-[#262626] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                aria-label="Close options"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowOptions(false);
                  setViewerOpen(true);
                }}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white text-[13px] font-extrabold rounded-xl active:scale-[0.96] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                View Signal Story
              </button>
              
              <button
                onClick={() => {
                  setShowOptions(false);
                  setShowImagePreview(true);
                }}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-extrabold rounded-xl active:scale-[0.96] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                View Profile Picture
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Signal Story Viewer overlay */}
      {viewerOpen && targetGroupIdx >= 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          <SignalStoryViewer
            groups={storyGroups}
            initialGroupIndex={targetGroupIdx}
            seenIds={seenStoryIds}
            onSeenUpdate={() => {}}
            onClose={() => setViewerOpen(false)}
          />
        </div>
      )}

      {/* Fullscreen profile picture overlay */}
      {showImagePreview && src && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImagePreviewModal
            open={showImagePreview}
            onClose={() => setShowImagePreview(false)}
            imageUrl={src}
            altText={username}
          />
        </div>
      )}
    </div>
  );
}
