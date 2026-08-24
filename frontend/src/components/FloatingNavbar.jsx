import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { subscribeToAdminMessage, markAdminMessageSeen } from '@/lib/adminMessageDb';
import GuestAuthModal from '@/components/GuestAuthModal';
import CreatePostModal from '@/components/CreatePostModal';
import UserAvatar from '@/components/UserAvatar';
import ExploreMenuModal from '@/components/ExploreMenuModal';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Home,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  Send
} from 'lucide-react';

export default function FloatingNavbar() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { unreadChatCount, pendingFriendRequests } = useHighlights();
  const prefersReducedMotion = useReducedMotion();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [domLoading, setDomLoading] = useState(false);
  const [hasUnseenAdmin, setHasUnseenAdmin] = useState(false);

  // Check for DOM loading screens/animations dynamically to hide navbar
  useEffect(() => {
    const checkLoader = () => {
      const hasLoader = !!document.getElementById('discuss-loading-screen') || 
                        !!document.getElementById('discuss-story-viewer') || 
                        !!document.querySelector('.bg-black.z-50') || 
                        (document.body && document.body.innerText && document.body.innerText.includes('Loading your feed...'));
      setDomLoading(hasLoader);
    };

    checkLoader();
    const interval = setInterval(checkLoader, 150);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to admin message state
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToAdminMessage((_message, isNew) => {
      setHasUnseenAdmin(isNew);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id]);

  const currentPath = location.pathname;
  const pathParts = currentPath.split('/').filter(Boolean);
  
  const isInsideChatRoom = pathParts[0] === 'chat' && pathParts.length > 1;
  const isInsideGroupRoom = pathParts[0] === 'group' && pathParts.length > 1;
  const isInsidePulseRoom = pathParts[0] === 'pulse';

  if (isInsideChatRoom || isInsideGroupRoom || isInsidePulseRoom || domLoading) {
    return null;
  }

  const handleOpenCreateModal = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleProfileClick = () => {
    if (hasUnseenAdmin) {
      markAdminMessageSeen();
      setHasUnseenAdmin(false);
    }
  };

  const navItems = [
    { key: 'home', to: '/feed', active: currentPath === '/feed', icon: Home, label: 'Home' },
    { key: 'chats', to: '/chat', active: currentPath.startsWith('/chat'), icon: Send, label: 'Chats', badge: unreadChatCount },
    { key: 'add', action: handleOpenCreateModal, active: false, icon: Plus, label: 'Create' },
    { key: 'ai', to: '/ai-assistant', active: currentPath === '/ai-assistant', icon: Sparkles, label: 'AI' },
    { key: 'explore', action: () => setShowExploreModal(true), active: ['/devradar', '/news', '/jobs', '/editor', '/bookmarks', '/talentgraph'].includes(currentPath), icon: MoreHorizontal, label: 'More' },
    { key: 'profile', to: '/profile', active: currentPath === '/profile', label: 'Profile' },
  ];

  return (
    <>
      <div
        className="floating-navbar-container fixed z-50 pointer-events-auto select-none left-1/2 -translate-x-1/2 w-[94%] max-w-[420px]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="relative h-[60px] w-full px-2 rounded-full bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-[#DBDBDB] dark:border-[#262626] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.active;
            const Icon = item.icon;

            if (item.key === 'profile') {
              return (
                <Link
                  key={item.key}
                  to={user ? "/profile" : "/login"}
                  onClick={handleProfileClick}
                  aria-label={item.label}
                  className="relative flex items-center justify-center p-1"
                >
                  <div className={`w-8 h-8 rounded-full p-[2px] transition-transform duration-150 active:scale-90 ${
                    isActive 
                      ? 'border-2 border-neutral-900 dark:border-white' 
                      : 'border border-transparent'
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <UserAvatar
                        src={user?.photo_url || null}
                        username={user?.username || 'Guest'}
                        alt={user?.username || 'Guest'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  {pendingFriendRequests > 0 && (
                    <span className="absolute top-0 right-0 min-w-[14px] h-[14px] px-1 rounded-full bg-[#ED4956] text-[9px] font-bold text-white flex items-center justify-center">
                      {pendingFriendRequests > 99 ? '99+' : pendingFriendRequests}
                    </span>
                  )}
                </Link>
              );
            }

            if (item.key === 'add') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  aria-label={item.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0095F6] hover:bg-[#1877F2] text-white shadow-sm transition-transform duration-150 active:scale-90"
                >
                  <Plus className="w-5 h-5 stroke-[2.5px]" />
                </button>
              );
            }

            if (item.action) {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.action}
                  aria-label={item.label}
                  className={`relative flex items-center justify-center p-2 text-neutral-800 dark:text-neutral-200 transition-transform duration-150 active:scale-90 ${
                    isActive ? 'text-[#0095F6] dark:text-[#0095F6]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                aria-label={item.label}
                className={`relative flex items-center justify-center p-2 transition-transform duration-150 active:scale-90 ${
                  isActive 
                    ? 'text-neutral-950 dark:text-white' 
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#ED4956] text-[10px] font-bold text-white flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <GuestAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <ExploreMenuModal
        open={showExploreModal}
        onClose={() => setShowExploreModal(false)}
      />
    </>
  );
}
