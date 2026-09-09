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

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import SignalStoryViewer from '@/components/SignalStoryViewer';
import { Zap, User as UserIcon, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { database, ref, onValue, off } from '@/lib/firebase';

// Share one live photo listener per user across every post, comment, and chat
// avatar. This keeps pictures current without opening duplicate connections.
const livePhotoEntries = new Map();
const globalAvatarCache = new Map();

/**
 * Universal canonical avatar URL resolver.
 * Priority:
 * 1. Primary photo_url / photoURL
 * 2. Legacy profile_image / avatar_url / avatarUrl / image
 * 3. Author snapshot fields (authorPhotoUrl / author_photo_url / author_photo)
 */
export function resolveCanonicalAvatarUrl(userOrData) {
  if (!userOrData) return '';
  if (typeof userOrData === 'string') {
    const trimmed = userOrData.trim();
    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) return '';
    return trimmed;
  }
  const raw = (
    userOrData.photo_url ||
    userOrData.photoURL ||
    userOrData.profile_image ||
    userOrData.avatar_url ||
    userOrData.avatarUrl ||
    userOrData.image ||
    userOrData.authorPhotoUrl ||
    userOrData.author_photo_url ||
    userOrData.author_photo ||
    ''
  );
  if (typeof raw === 'string' && (raw.includes('drive.google.com') || raw.includes('docs.google.com'))) {
    return '';
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

export function getStoredAvatar(userId) {
  if (!userId) return '';
  return globalAvatarCache.get(String(userId)) || '';
}

export function setStoredAvatar(userId, url) {
  if (!userId) return;
  globalAvatarCache.set(String(userId), url ? String(url).trim() : '');
}

/**
 * Broadcast an optimistic or confirmed avatar update immediately to all
 * mounted avatar instances across feed, comments, header, account panel, etc.
 */
export function broadcastAvatarUpdate(userId, newPhotoUrl) {
  if (!userId) return;
  const key = String(userId);
  const cleanUrl = newPhotoUrl ? String(newPhotoUrl).trim() : '';
  globalAvatarCache.set(key, cleanUrl);

  const entry = livePhotoEntries.get(key);
  if (entry) {
    entry.value = cleanUrl;
    entry.listeners.forEach((notify) => {
      try {
        notify(cleanUrl);
      } catch (_) {}
    });
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('discuss_avatar_sync', {
          detail: { userId: key, photoUrl: cleanUrl },
        })
      );
    } catch (_) {}
  }
}

function subscribeToLivePhoto(userId, listener) {
  if (!userId) return () => {};
  const key = String(userId);
  let entry = livePhotoEntries.get(key);
  if (!entry) {
    const photoRef = ref(database, `users/${key}/photo_url`);
    entry = { listeners: new Set(), value: globalAvatarCache.get(key), photoRef };
    entry.handleValue = (snapshot) => {
      const val = snapshot.exists() ? (snapshot.val() || '') : '';
      entry.value = val;
      globalAvatarCache.set(key, val);
      entry.listeners.forEach((notify) => {
        try {
          notify(val);
        } catch (_) {}
      });
    };
    onValue(photoRef, entry.handleValue);
    livePhotoEntries.set(key, entry);
  }

  entry.listeners.add(listener);
  // Deliver cached value synchronously to eliminate any initials or old-image flicker
  const currentVal = entry.value !== undefined ? entry.value : globalAvatarCache.get(key);
  if (currentVal !== undefined) {
    try {
      listener(currentVal);
    } catch (_) {}
  }

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      off(entry.photoRef, 'value', entry.handleValue);
      livePhotoEntries.delete(key);
    }
  };
}

/**
 * Derive deterministic initials: up to 2 characters from username or full name
 */
export function getDeterministicInitials(nameOrUsername) {
  if (!nameOrUsername || typeof nameOrUsername !== 'string') return '?';
  const trimmed = nameOrUsername.trim();
  if (!trimmed) return '?';

  // If there are multiple words (e.g. "Mohammed Maaz"), take first letter of each
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].replace(/[^a-zA-Z0-9]/g, '');
    const second = parts[1].replace(/[^a-zA-Z0-9]/g, '');
    if (first && second) {
      return (first[0] + second[0]).toUpperCase();
    }
  }

  const raw = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  if (raw.length >= 2) return raw.slice(0, 2).toUpperCase();
  if (raw.length === 1) return raw.toUpperCase();
  return (trimmed[0] || '?').toUpperCase();
}

/**
 * @param {string}  src          — image URL (photo_url / photoURL)
 * @param {object}  [user]       — optional user object with canonical avatar fields
 * @param {string}  username     — used to generate the initials fallback
 * @param {string}  [className]  — additional CSS classes (e.g. "w-9 h-9")
 * @param {string}  [alt]        — alt text (defaults to username)
 * @param {string}  [fallbackBg] — CSS background for the initials avatar
 * @param {string}  [userId]     — canonical user ID for live photo subscription
 */
export default function UserAvatar({
  src,
  user,
  username = '?',
  className = 'w-9 h-9',
  alt,
  fallbackBg = 'linear-gradient(135deg, #2563EB, #1d4ed8)',
  style = {},
  userId: propUserId,
  priority = false,
}) {
  const { user: currentUser } = useAuth();
  const highlights = useHighlights();
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve target userId
  const resolvedUserId = propUserId || user?.id || user?.userId || user?.uid || null;
  const userId = resolvedUserId;

  const isCurrentUserAvatar = Boolean(
    currentUser && (
      (resolvedUserId && String(resolvedUserId) === String(currentUser.id)) ||
      (!resolvedUserId && username && username.toLowerCase() === (currentUser.username || '').toLowerCase())
    )
  );

  const currentUserPhoto = currentUser ? (currentUser.photo_url || currentUser.photoURL || '') : '';
  const initialCacheVal = resolvedUserId
    ? (globalAvatarCache.get(String(resolvedUserId)) ?? (isCurrentUserAvatar ? currentUserPhoto : undefined))
    : (isCurrentUserAvatar ? currentUserPhoto : undefined);

  const [liveProfileSrc, setLiveProfileSrc] = useState(initialCacheVal);

  useEffect(() => {
    if (!resolvedUserId) {
      if (isCurrentUserAvatar) {
        setLiveProfileSrc(currentUserPhoto);
      }
      return undefined;
    }

    const unbind = subscribeToLivePhoto(resolvedUserId, (updatedUrl) => {
      setLiveProfileSrc(updatedUrl);
    });

    const handleSync = (e) => {
      if (e.detail?.userId === String(resolvedUserId)) {
        setLiveProfileSrc(e.detail.photoUrl);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('discuss_avatar_sync', handleSync);
    }

    return () => {
      unbind();
      if (typeof window !== 'undefined') {
        window.removeEventListener('discuss_avatar_sync', handleSync);
      }
    };
  }, [resolvedUserId, isCurrentUserAvatar, currentUserPhoto]);

  // Keep currentUser photo in sync if AuthContext updates
  useEffect(() => {
    if (isCurrentUserAvatar && currentUserPhoto) {
      setLiveProfileSrc(currentUserPhoto);
      if (resolvedUserId) {
        globalAvatarCache.set(String(resolvedUserId), currentUserPhoto);
      }
    }
  }, [isCurrentUserAvatar, currentUserPhoto, resolvedUserId]);

  const candidateSrc = resolveCanonicalAvatarUrl(user) || resolveCanonicalAvatarUrl(src);

  const resolvedSrc = useMemo(() => {
    if (isCurrentUserAvatar) {
      if (liveProfileSrc !== undefined && liveProfileSrc !== '') return liveProfileSrc;
      if (currentUserPhoto) return currentUserPhoto;
      return candidateSrc || '';
    }

    if (liveProfileSrc !== undefined && liveProfileSrc !== '') {
      return liveProfileSrc;
    }

    if (resolvedUserId && globalAvatarCache.has(String(resolvedUserId))) {
      const cached = globalAvatarCache.get(String(resolvedUserId));
      if (cached !== undefined && cached !== '') return cached;
    }

    return candidateSrc || '';
  }, [isCurrentUserAvatar, liveProfileSrc, currentUserPhoto, candidateSrc, resolvedUserId]);

  const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
  const [failed, setFailed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const altText = alt || username || 'User';

  // Filter out resource URLs that are blocked by cross-origin policies (e.g. drive.google.com)
  const isBlockedResource = useMemo(() => {
    if (!resolvedSrc || typeof resolvedSrc !== 'string') return false;
    return resolvedSrc.includes('drive.google.com') || resolvedSrc.includes('docs.google.com');
  }, [resolvedSrc]);

  // Keep the previous decoded avatar visible until the replacement is ready.
  // This prevents the initials/old-image flash when cached profile data is
  // reconciled with a newly uploaded picture.
  useEffect(() => {
    if (isBlockedResource || !resolvedSrc) {
      setDisplaySrc('');
      setFailed(isBlockedResource);
      return undefined;
    }
    if (resolvedSrc === displaySrc) {
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    const preload = new Image();
    preload.referrerPolicy = 'no-referrer';
    preload.decoding = 'async';
    preload.onload = () => {
      if (cancelled) return;
      setDisplaySrc(resolvedSrc);
      setFailed(false);
    };
    preload.onerror = () => {
      if (!cancelled) {
        setDisplaySrc('');
        setFailed(true);
      }
    };
    preload.src = resolvedSrc;
    return () => {
      cancelled = true;
    };
  }, [displaySrc, resolvedSrc, isBlockedResource]);

  const initials = useMemo(() => getDeterministicInitials(alt || username), [alt, username]);

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
      if (displaySrc && !failed) {
        setShowImagePreview(true);
      }
    }
  };

  const innerAvatarMarkup = displaySrc && !failed ? (
    <img
      src={displaySrc}
      alt={altText}
      className={`${className} rounded-full object-cover object-center flex-shrink-0 story-shining-avatar no-drag ${!currentUser ? 'grayscale opacity-60 pointer-events-none' : ''}`}
      style={{ objectFit: 'cover', objectPosition: 'center', ...style }}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
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
            className="w-full max-w-[280px] p-5 bg-white/95 dark:bg-[#1E293B]/95 dark:bg-black/95 border border-neutral-200 dark:border-white/10 dark:border-[#262626] rounded-2xl shadow-2xl backdrop-blur-2xl"
          >
            {/* Header row with Title and Close X Button */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-200/50 dark:border-white/10 dark:border-[#262626]">
              <span className="text-xs font-extrabold tracking-tight text-neutral-800 dark:text-neutral-200 dark:text-white">
                @{username}
              </span>
              <button 
                onClick={() => setShowOptions(false)}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:bg-[#1A1A1A] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
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
      {showImagePreview && displaySrc && (
        <div onClick={(e) => e.stopPropagation()}>
          <ImagePreviewModal
            open={showImagePreview}
            onClose={() => setShowImagePreview(false)}
            imageUrl={displaySrc}
            altText={username}
          />
        </div>
      )}
    </div>
  );
}
