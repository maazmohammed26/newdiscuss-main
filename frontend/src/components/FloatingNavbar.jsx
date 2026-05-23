import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { subscribeToAdminMessage, markAdminMessageSeen } from '@/lib/adminMessageDb';
import CreatePostModal from '@/components/CreatePostModal';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  House,
  MessageCircle,
  Radar,
  Megaphone,
} from 'lucide-react';

export default function FloatingNavbar() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { unreadChatCount, pendingFriendRequests } = useHighlights();

  const [visible, setVisible] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [domLoading, setDomLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState(null);
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
    const interval = setInterval(checkLoader, 100);
    return () => clearInterval(interval);
  }, []);

  // Hide bottom nav on scroll, show when scroll stops
  useEffect(() => {
    let scrollTimeout = null;

    const handleScroll = () => {
      // Hide while actively scrolling
      setVisible(false);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      // Show back up after 250ms of inactivity
      scrollTimeout = setTimeout(() => {
        setVisible(true);
      }, 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  // Subscribe to admin message state for profile tab indicator
  useEffect(() => {
    if (!user?.id) return undefined;
    const unsubscribe = subscribeToAdminMessage((msg, isNew) => {
      setAdminMessage(msg);
      setHasUnseenAdmin(isNew);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Only render for logged-in users
  if (!user) return null;

  const currentPath = location.pathname;
  const pathParts = currentPath.split('/').filter(Boolean);
  
  // Dynamic page check rules:
  // 1. Hide inside specific chat conversation page: /chat/:otherUserId
  const isInsideChatRoom = pathParts[0] === 'chat' && pathParts.length > 1;
  // 2. Hide inside group conversation page: /group/:groupId
  const isInsideGroupRoom = pathParts[0] === 'group' && pathParts.length > 1;
  // 3. Hide inside reels/pulse page completely: any path starting with /pulse
  const isInsidePulseRoom = pathParts[0] === 'pulse';

  // Hide navbar completely if loading or inside specific rooms / pulse views
  if (isInsideChatRoom || isInsideGroupRoom || isInsidePulseRoom || domLoading) {
    return null;
  }

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleProfileClick = () => {
    if (hasUnseenAdmin) {
      markAdminMessageSeen();
      setHasUnseenAdmin(false);
    }
  };

  // Theme-specific styles
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isDiscussLight = theme === 'discuss-light';
  const isDiscussBlack = theme === 'discuss-black';

  // Outer Dock Container Classes
  let dockContainerClass = '';
  let indicatorClass = '';
  let inactiveIconClass = '';
  let activeIconClass = '';
  let addButtonClass = '';
  let profileRingClass = '';

  if (isLight) {
    dockContainerClass = 'bg-white/65 border border-white/60 shadow-[0_12px_36px_rgba(31,41,55,0.16)]';
    indicatorClass = 'bg-white/85 border border-white/80 shadow-[0_8px_24px_rgba(59,130,246,0.24)]';
    inactiveIconClass = 'text-slate-500';
    activeIconClass = 'text-blue-600';
    addButtonClass = 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)]';
    profileRingClass = 'ring-blue-500/30';
  } else if (isDark) {
    dockContainerClass = 'bg-slate-900/55 border border-white/15 shadow-[0_12px_42px_rgba(0,0,0,0.48)]';
    indicatorClass = 'bg-white/12 border border-white/20 shadow-[0_0_22px_rgba(59,130,246,0.38)]';
    inactiveIconClass = 'text-slate-300/85';
    activeIconClass = 'text-blue-300';
    addButtonClass = 'bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.45)]';
    profileRingClass = 'ring-blue-300/40';
  } else if (isDiscussLight) {
    dockContainerClass = 'bg-white/70 border border-slate-300/80 shadow-[0_12px_36px_rgba(0,0,0,0.2)]';
    indicatorClass = 'bg-white/90 border border-slate-200 shadow-[0_8px_24px_rgba(14,165,233,0.24)]';
    inactiveIconClass = 'text-slate-600';
    activeIconClass = 'text-sky-600';
    addButtonClass = 'bg-sky-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.4)]';
    profileRingClass = 'ring-sky-500/30';
  } else if (isDiscussBlack) {
    dockContainerClass = 'bg-[#11121C]/55 border border-white/10 shadow-[0_12px_42px_rgba(0,0,0,0.65),_0_0_20px_rgba(59,130,246,0.16)]';
    indicatorClass = 'bg-white/10 border border-white/20 shadow-[0_0_24px_rgba(124,58,237,0.42)]';
    inactiveIconClass = 'text-slate-300/80';
    activeIconClass = 'text-violet-200';
    addButtonClass = 'bg-violet-500 text-white shadow-[0_8px_24px_rgba(139,92,246,0.45)]';
    profileRingClass = 'ring-violet-400/40';
  }

  const navItems = [
    { key: 'home', to: '/feed', active: currentPath === '/feed', icon: House, label: 'Home' },
    { key: 'chats', to: '/chat', active: currentPath.startsWith('/chat'), icon: MessageCircle, label: 'Chats' },
    { key: 'add', action: handleOpenCreateModal, active: false, icon: Plus, label: 'Add Post' },
    { key: 'devradar', to: '/devradar', active: currentPath === '/devradar', icon: Radar, label: 'DevRadar' },
    { key: 'profile', to: '/profile', active: currentPath === '/profile', label: 'Profile' },
  ];

  return (
    <>
      <div
        className={`floating-navbar-container fixed bottom-6 left-1/2 z-50 w-[92%] max-w-[420px] select-none ${
          visible ? 'visible-state' : 'hidden-state'
        }`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className={`relative h-[74px] rounded-full px-2 backdrop-blur-[24px] ${dockContainerClass}`}>
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent pointer-events-none" />
          <div className="grid grid-cols-5 h-full items-center justify-items-center relative">
            {navItems.map((item, index) => {
              const isActive = item.active;
              const Icon = item.icon;
              const baseIconClass = `relative z-10 transition-all duration-300 ${
                isActive ? `${activeIconClass} scale-110 drop-shadow-[0_0_14px_rgba(99,102,241,0.55)]` : `${inactiveIconClass} scale-100`
              }`;

              const content = (
                <div className="relative flex h-12 w-full items-center justify-center rounded-full">
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        layoutId="floating-nav-active-pill"
                        transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
                        className={`absolute inset-1 rounded-full ${indicatorClass}`}
                      />
                    )}
                  </AnimatePresence>

                  {item.key === 'profile' ? (
                    <div className="relative z-10">
                      <div className={`rounded-full ring-2 ${isActive ? profileRingClass : 'ring-transparent'} transition-all duration-300`}>
                        <UserAvatar
                          src={user.photo_url || null}
                          username={user.username}
                          alt={user.username}
                          className="h-7 w-7 rounded-full"
                        />
                      </div>
                      {adminMessage && (
                        <span className="absolute -top-1.5 -right-2 rounded-full p-0.5 bg-slate-900/90 border border-white/40 shadow-[0_0_8px_rgba(148,163,184,0.5)]">
                          <Megaphone className="w-2.5 h-2.5 text-amber-300" />
                        </span>
                      )}
                      {hasUnseenAdmin && (
                        <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white/90" />
                      )}
                      {pendingFriendRequests > 0 && (
                        <span className="absolute -bottom-1 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-blue-600 text-[8px] font-black text-white flex items-center justify-center">
                          {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                        </span>
                      )}
                    </div>
                  ) : item.key === 'add' ? (
                    <button
                      type="button"
                      onClick={item.action}
                      aria-label={item.label}
                      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-300 active:scale-90 hover:scale-105 ${addButtonClass}`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  ) : (
                    Icon && <Icon className={`w-5 h-5 ${baseIconClass}`} />
                  )}

                  {item.key === 'chats' && unreadChatCount > 0 && (
                    <span className="absolute top-1 right-3 z-20 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
                </div>
              );

              if (item.to) {
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={item.key === 'profile' ? handleProfileClick : undefined}
                    aria-label={item.label}
                    className="relative h-full w-full flex items-center justify-center"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.key} className="relative h-full w-full flex items-center justify-center">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialType="discussion"
        onCreated={() => setShowCreateModal(false)}
      />

      <style>{`
        .floating-navbar-container {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), scale 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .floating-navbar-container.visible-state {
          transform: translateX(-50%) translateY(0) scale(1) !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .floating-navbar-container.hidden-state {
          transform: translateX(-50%) translateY(120px) scale(0.95) !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </>
  );
}
