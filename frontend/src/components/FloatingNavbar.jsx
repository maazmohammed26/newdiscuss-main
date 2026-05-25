import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { subscribeToAdminMessage, markAdminMessageSeen } from '@/lib/adminMessageDb';
import {
  AVATAR_PULSE_MIN_OPACITY,
  AVATAR_PULSE_MAX_OPACITY,
} from '@/lib/uiConstants';
import GuestAuthModal from '@/components/GuestAuthModal';
import CreatePostModal from '@/components/CreatePostModal';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Home,
  MessageCircle,
  Radar,
} from 'lucide-react';

export default function FloatingNavbar() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { unreadChatCount, pendingFriendRequests } = useHighlights();
  const prefersReducedMotion = useReducedMotion();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
    const interval = setInterval(checkLoader, 100);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to admin message state for profile tab indicator
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
  let activeGlowClass = '';
  let addButtonClass = '';
  let profileAvatarShellClass = '';
  let profileAvatarPulseShadowClass = '';
  let profileAvatarInnerClass = '';
  let glassReflectionClass = '';
  let glassBorderGlowClass = '';

  if (isLight) {
    dockContainerClass = 'bg-black/52 border border-white/20 shadow-[0_16px_42px_rgba(2,6,23,0.48)]';
    indicatorClass = 'bg-white/85 border border-white/80 shadow-[0_8px_24px_rgba(59,130,246,0.24)]';
    inactiveIconClass = 'text-slate-700';
    activeIconClass = 'text-slate-900';
    activeGlowClass = 'drop-shadow-[0_0_14px_rgba(37,99,235,0.45)]';
    addButtonClass = 'bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)]';
    profileAvatarShellClass = 'border border-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.55),_0_0_10px_rgba(37,99,235,0.24),_0_0_10px_rgba(239,68,68,0.24)]';
    profileAvatarPulseShadowClass = 'shadow-[0_0_9px_rgba(37,99,235,0.28),_0_0_9px_rgba(239,68,68,0.22)]';
    profileAvatarInnerClass = 'bg-white/20';
    glassReflectionClass = 'from-white/45 via-white/10 to-transparent';
    glassBorderGlowClass = 'ring-white/35';
  } else if (isDark) {
    dockContainerClass = 'bg-slate-900/52 border border-white/22 shadow-[0_16px_46px_rgba(0,0,0,0.55)]';
    indicatorClass = 'bg-white/12 border border-white/20 shadow-[0_0_22px_rgba(59,130,246,0.38)]';
    inactiveIconClass = 'text-slate-100';
    activeIconClass = 'text-blue-100';
    activeGlowClass = 'drop-shadow-[0_0_14px_rgba(147,197,253,0.55)]';
    addButtonClass = 'bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.45)]';
    profileAvatarShellClass = 'border border-white/65 shadow-[0_0_0_1px_rgba(255,255,255,0.36),_0_0_12px_rgba(37,99,235,0.3),_0_0_12px_rgba(239,68,68,0.3)]';
    profileAvatarPulseShadowClass = 'shadow-[0_0_12px_rgba(37,99,235,0.32),_0_0_12px_rgba(239,68,68,0.28)]';
    profileAvatarInnerClass = 'bg-black/20';
    glassReflectionClass = 'from-white/40 via-white/10 to-transparent';
    glassBorderGlowClass = 'ring-white/30';
  } else if (isDiscussLight) {
    dockContainerClass = 'bg-black/54 border border-white/18 shadow-[0_16px_42px_rgba(2,6,23,0.55)]';
    indicatorClass = 'bg-white/90 border border-slate-200 shadow-[0_8px_24px_rgba(14,165,233,0.24)]';
    inactiveIconClass = 'text-slate-700';
    activeIconClass = 'text-slate-900';
    activeGlowClass = 'drop-shadow-[0_0_12px_rgba(2,132,199,0.4)]';
    addButtonClass = 'bg-sky-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.4)]';
    profileAvatarShellClass = 'border border-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.42),_0_0_10px_rgba(37,99,235,0.24),_0_0_10px_rgba(239,68,68,0.22)]';
    profileAvatarPulseShadowClass = 'shadow-[0_0_10px_rgba(37,99,235,0.25),_0_0_10px_rgba(239,68,68,0.22)]';
    profileAvatarInnerClass = 'bg-white/20';
    glassReflectionClass = 'from-white/42 via-white/12 to-transparent';
    glassBorderGlowClass = 'ring-white/36';
  } else if (isDiscussBlack) {
    dockContainerClass = 'bg-[#11121C]/50 border border-white/16 shadow-[0_16px_48px_rgba(0,0,0,0.7),_0_0_20px_rgba(59,130,246,0.14)]';
    indicatorClass = 'bg-white/10 border border-white/20 shadow-[0_0_24px_rgba(124,58,237,0.42)]';
    inactiveIconClass = 'text-slate-100';
    activeIconClass = 'text-violet-100';
    activeGlowClass = 'drop-shadow-[0_0_14px_rgba(196,181,253,0.55)]';
    addButtonClass = 'bg-violet-500 text-white shadow-[0_8px_24px_rgba(139,92,246,0.45)]';
    profileAvatarShellClass = 'border border-white/58 shadow-[0_0_0_1px_rgba(255,255,255,0.24),_0_0_12px_rgba(59,130,246,0.3),_0_0_12px_rgba(239,68,68,0.28)]';
    profileAvatarPulseShadowClass = 'shadow-[0_0_12px_rgba(59,130,246,0.3),_0_0_12px_rgba(239,68,68,0.28)]';
    profileAvatarInnerClass = 'bg-black/20';
    glassReflectionClass = 'from-white/38 via-white/10 to-transparent';
    glassBorderGlowClass = 'ring-white/28';
  }

  const navItems = [
    { key: 'home', to: '/feed', active: currentPath === '/feed', icon: Home, label: 'Home' },
    { key: 'chats', to: '/chat', active: currentPath.startsWith('/chat'), icon: MessageCircle, label: 'Chats' },
    { key: 'add', action: handleOpenCreateModal, active: false, icon: Plus, label: 'Add Post' },
    { key: 'devradar', to: '/devradar', active: currentPath === '/devradar', icon: Radar, label: 'DevRadar' },
    { key: 'profile', to: '/profile', active: currentPath === '/profile', label: 'Profile' },
  ];

  return (
    <>
      <motion.div
        className="floating-navbar-container fixed left-1/2 z-50 w-[92%] max-w-[420px] select-none pointer-events-auto"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        initial={false}
        animate={{ x: '-50%', y: 0, scale: 1, opacity: 1 }}
        transition={prefersReducedMotion ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 260, damping: 28, mass: 0.84 }}
      >
        <div className={`relative h-[74px] rounded-full px-2 backdrop-blur-[26px] overflow-hidden ${dockContainerClass}`}>
          <div className={`absolute inset-[1px] rounded-full ring-1 ${glassBorderGlowClass} pointer-events-none`} />
          <div className={`absolute inset-x-8 top-[2px] h-[1px] bg-gradient-to-r from-transparent ${glassReflectionClass} pointer-events-none`} />
          <div className="absolute -top-5 -left-10 w-40 h-14 bg-white/25 blur-xl rotate-[-8deg] pointer-events-none" />
          <div className="absolute -bottom-6 right-[-18%] w-36 h-12 bg-sky-300/10 blur-2xl pointer-events-none" />
          <div className="grid grid-cols-5 h-full items-center justify-items-center relative">
            {navItems.map((item) => {
              const isActive = item.active;
              const Icon = item.icon;
              const baseIconClass = `relative z-10 transition-all duration-300 ${
                isActive ? `${activeIconClass} ${activeGlowClass} scale-110` : `${inactiveIconClass} scale-100`
              }`;

              const content = (
                <div className="relative flex h-12 w-full items-center justify-center rounded-full">
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        layoutId="floating-nav-active-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.7 }}
                        className={`absolute inset-1 rounded-full ${indicatorClass}`}
                      />
                    )}
                  </AnimatePresence>

                  {item.key === 'profile' ? (
                    <div className="relative z-10">
                      <motion.div
                        className={`relative p-[1px] rounded-full ${profileAvatarShellClass} ${profileAvatarPulseShadowClass}`}
                        animate={prefersReducedMotion ? undefined : { opacity: [AVATAR_PULSE_MIN_OPACITY, AVATAR_PULSE_MAX_OPACITY, AVATAR_PULSE_MIN_OPACITY] }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_20%_25%,rgba(239,68,68,0.38),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.35),transparent_45%)] pointer-events-none" />
                        <div className={`relative rounded-full overflow-hidden ${profileAvatarInnerClass}`}>
                          <UserAvatar
                            src={user?.photo_url || null}
                            username={user?.username || 'Guest'}
                            alt={user?.username || 'Guest'}
                            className="h-7 w-7 rounded-full"
                          />
                        </div>
                      </motion.div>
                      {pendingFriendRequests > 0 && (
                        <span className="absolute -bottom-1 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-blue-600 text-[8px] font-black text-white flex items-center justify-center">
                          {pendingFriendRequests > 99 ? '99+' : pendingFriendRequests}
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
                    onClick={(e) => {
                      if (!user && ['chats', 'devradar', 'profile'].includes(item.key)) {
                        e.preventDefault();
                        setShowAuthModal(true);
                        return;
                      }
                      if (item.key === 'profile') handleProfileClick();
                    }}
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
      </motion.div>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialType="discussion"
        onCreated={() => setShowCreateModal(false)}
      />

      <GuestAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

    </>
  );
}
