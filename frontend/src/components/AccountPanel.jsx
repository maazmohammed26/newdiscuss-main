import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, FileText, Users, Bookmark, Settings, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified } from '@/lib/verification';
import { getUserProfile, getCachedUserProfile } from '@/lib/userProfileDb';
import { getFriendsWithDetails } from '@/lib/relationshipsDb';

export default function AccountPanel({ open, onClose, anchorRef, position = 'auto' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(() => (typeof getCachedUserProfile === 'function' ? getCachedUserProfile(user?.id) : null));

  const [friendsCount, setFriendsCount] = useState(0);
  const panelRef = useRef(null);

  // Load canonical profile data & friends count
  useEffect(() => {
    if (!user?.id || !open) return;
    let isMounted = true;

    getUserProfile(user.id)
      .then((data) => {
        if (isMounted && data) setProfileData(data);
      })
      .catch(() => {});

    getFriendsWithDetails(user.id)
      .then((friends) => {
        if (isMounted && Array.isArray(friends)) {
          setFriendsCount(friends.length);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.id, open]);

  // Keyboard accessibility: Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!user) return null;

  const displayName = profileData?.fullName || user.full_name || user.username || 'User';
  const username = user.username || 'user';
  const verified = isUserVerified(user);

  const handleAction = (path) => {
    onClose?.();
    navigate(path);
  };

  const menuItems = [
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      onClick: () => handleAction('/bookmarks'),
      description: 'Saved discussions and resources',
    },
    {
      id: 'settings',
      label: 'Settings & Privacy',
      icon: Settings,
      onClick: () => handleAction('/settings'),
      description: 'Account, preferences, and security',
    },
  ];

  const desktopPlacementClasses = position === 'top'
    ? 'lg:items-start lg:justify-end lg:pt-16 lg:pr-6'
    : position === 'bottom'
    ? 'lg:items-end lg:justify-end lg:pb-20 lg:pr-8'
    : 'lg:items-end lg:justify-end lg:pb-16 lg:pr-8';

  return (
    <AnimatePresence>
      {open && (
        <div 
          className={`fixed inset-0 z-50 flex items-end md:items-center md:justify-center ${desktopPlacementClasses} select-none`}
          role="dialog"
          aria-modal="true"
          aria-label="Account Panel"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Account Panel Container */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full md:max-w-sm lg:max-w-[360px] bg-white dark:bg-[#121212] border border-neutral-200/90 dark:border-[#262626] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden md:mb-6 md:mx-auto lg:mb-0 lg:mx-0 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] md:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="md:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Panel Header */}
            <div className="px-5 pt-3 pb-4 border-b border-neutral-100 dark:border-[#222222] flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Account
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close account panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Identity Block */}
            <div 
              onClick={() => handleAction('/profile')}
              className="px-5 py-4 flex items-center gap-3.5 hover:bg-neutral-50 dark:hover:bg-[#181818] transition-colors cursor-pointer group"
              role="button"
              tabIndex={0}
              aria-label={`View profile for ${displayName}`}
            >
              <div className="w-12 h-12 rounded-full ring-2 ring-[#0095F6]/30 dark:ring-white/20 p-[1.5px] shrink-0">
                <UserAvatar
                  src={user.photo_url}
                  username={user.username}
                  userId={user.id}
                  priority
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[15px] text-neutral-900 dark:text-white truncate">
                    {displayName}
                  </span>
                  {verified && <VerifiedBadge size="sm" />}
                </div>
                <div className="text-[13px] text-neutral-500 dark:text-neutral-400 truncate">
                  @{username}
                </div>
                <div className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  {friendsCount > 0 ? `${friendsCount} Friends` : 'Connect with creators'}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </div>

            <div className="h-px bg-neutral-100 dark:bg-[#202020] mx-4" />

            {/* Navigation Actions */}
            <nav className="p-2 flex flex-col gap-1" aria-label="Account navigation">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full px-3.5 py-3 rounded-xl flex items-center justify-between text-left hover:bg-neutral-100 dark:hover:bg-[#1a1a1a] transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0095F6]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4 stroke-[2px]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[14px] font-semibold text-neutral-900 dark:text-white block truncate">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block truncate">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {item.badge ? (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#0095F6]/10 text-[#0095F6] shrink-0 ml-2">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
