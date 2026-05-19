import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { useSecurity } from '@/contexts/SecurityContext';
import CreatePostModal from '@/components/CreatePostModal';
import { 
  Plus, 
  Play, 
  FolderGit2, 
  MessageSquarePlus, 
  Video,
  X,
  Compass,
  MessageSquare,
  Lock,
  Unlock,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function FloatingNavbar() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadChatCount } = useHighlights();
  const { localSettings, remoteSettings, lockNow } = useSecurity();

  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initialPostType, setInitialPostType] = useState('discussion');
  const [showSecurityTutorial, setShowSecurityTutorial] = useState(false);
  const [domLoading, setDomLoading] = useState(false);

  const menuRef = useRef(null);

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

  // Check if lock (PIN) is enabled
  const isLockEnabled = localSettings?.enabled || !!remoteSettings?.pin;

  // Hide bottom nav on scroll, show when scroll stops
  useEffect(() => {
    let lastScrollY = window.pageYOffset;
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

  // Close speed dial when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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

  const handleOpenCreateModal = (type) => {
    setInitialPostType(type);
    setShowCreateModal(true);
    setMenuOpen(false);
  };

  const handleLockClick = () => {
    if (isLockEnabled) {
      lockNow();
      toast.success('Session secured! App locked.');
    } else {
      setShowSecurityTutorial(true);
    }
  };

  // Theme-specific styles
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isDiscussLight = theme === 'discuss-light';
  const isDiscussBlack = theme === 'discuss-black';

  // 1. Outer Dock Container Classes
  let dockContainerClass = '';
  if (isLight) {
    dockContainerClass = 'bg-white/90 backdrop-blur-xl border border-neutral-200/50 shadow-[0_10px_35px_rgba(0,0,0,0.06)] rounded-[28px]';
  } else if (isDark) {
    dockContainerClass = 'bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-[28px]';
  } else if (isDiscussLight) {
    dockContainerClass = 'bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] rounded-none';
  } else if (isDiscussBlack) {
    dockContainerClass = 'bg-[#13131A]/90 backdrop-blur-xl border border-[#FF007F]/20 shadow-[0_8px_32px_rgba(0,0,0,0.7),_0_0_15px_rgba(255,0,127,0.15)] rounded-[28px]';
  }

  // Top Accent Line
  let topAccentClass = '';
  if (isLight) {
    topAccentClass = 'bg-gradient-to-r from-transparent via-blue-500/10 to-transparent';
  } else if (isDark) {
    topAccentClass = 'bg-gradient-to-r from-transparent via-blue-500/35 to-transparent';
  } else if (isDiscussLight) {
    topAccentClass = 'hidden';
  } else if (isDiscussBlack) {
    topAccentClass = 'bg-gradient-to-r from-transparent via-[#FF007F]/30 to-transparent';
  }

  // 2. Nav Item Base & Active Classes
  const getNavItemClass = (path) => {
    const isActive = path === '/feed' ? currentPath === '/feed' 
                   : path === '/chat' ? currentPath.startsWith('/chat')
                   : path === '/pulse' ? currentPath === '/pulse'
                   : false;

    const baseRound = isDiscussLight ? 'rounded-none' : 'rounded-2xl';

    if (isActive) {
      if (isLight) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-blue-600 bg-blue-50`;
      } else if (isDark) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-blue-400 bg-blue-950/20`;
      } else if (isDiscussLight) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-red-600 bg-red-50 border border-black`;
      } else if (isDiscussBlack) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-[#FF007F] bg-[#FF007F]/10`;
      }
    } else {
      if (isLight) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-[#64748B] hover:text-neutral-900 hover:bg-neutral-100/80`;
      } else if (isDark) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5`;
      } else if (isDiscussLight) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-black hover:bg-black/5`;
      } else if (isDiscussBlack) {
        return `group relative flex items-center justify-center w-12 h-12 ${baseRound} transition-all duration-300 text-[#9090A8] hover:text-white hover:bg-white/5`;
      }
    }
  };

  // Nav Item Drop Shadow for Icons
  const getIconDropShadow = (path) => {
    const isActive = path === '/feed' ? currentPath === '/feed' 
                   : path === '/chat' ? currentPath.startsWith('/chat')
                   : path === '/pulse' ? currentPath === '/pulse'
                   : false;
    if (!isActive) return '';
    if (isLight) return 'drop-shadow-[0_2px_6px_rgba(37,99,235,0.25)]';
    if (isDark) return 'drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]';
    if (isDiscussLight) return '';
    if (isDiscussBlack) return 'drop-shadow-[0_0_8px_rgba(255,0,127,0.5)]';
    return '';
  };

  // Active Dot Indicator
  const getActiveDot = (path) => {
    const isActive = path === '/feed' ? currentPath === '/feed' 
                   : path === '/chat' ? currentPath.startsWith('/chat')
                   : path === '/pulse' ? currentPath === '/pulse'
                   : false;
    if (!isActive) return null;
    
    if (isLight) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />;
    } else if (isDark) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />;
    } else if (isDiscussLight) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-red-600 rounded-none border border-black animate-pulse" />;
    } else if (isDiscussBlack) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#FF007F] rounded-full animate-pulse shadow-[0_0_6px_#FF007F]" />;
    }
    return null;
  };

  // 3. Central Plus Button Classes
  let plusButtonClass = '';
  let plusOrbitClass = '';
  let speedDialClass = '';
  let speedDialBtnClass = '';
  let speedDialTipClass = '';
  
  if (isLight) {
    plusButtonClass = 'text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] border border-blue-500/10';
    plusOrbitClass = menuOpen 
      ? 'scale-110 blur-md bg-gradient-to-tr from-blue-400 via-blue-500 to-indigo-500 opacity-60'
      : 'scale-100 blur-sm bg-blue-500 opacity-20 group-hover:scale-105';
    speedDialClass = 'bg-white/95 backdrop-blur-xl border border-neutral-200/50 shadow-[0_10px_35px_rgba(0,0,0,0.1)] rounded-2xl';
    speedDialBtnClass = 'bg-neutral-50 border border-neutral-200/40 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-500/20';
    speedDialTipClass = 'bg-neutral-900 border border-neutral-800 text-white';
  } else if (isDark) {
    plusButtonClass = 'text-white bg-blue-600 hover:bg-blue-500 shadow-[0_4px_14px_rgba(37,99,235,0.45)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.55)] border border-white/20';
    plusOrbitClass = menuOpen 
      ? 'scale-110 blur-md bg-gradient-to-tr from-blue-500 via-indigo-600 to-blue-400 opacity-80'
      : 'scale-100 blur-sm bg-blue-600 opacity-30 group-hover:scale-105';
    speedDialClass = 'bg-[#0F172A]/95 backdrop-blur-xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] rounded-2xl';
    speedDialBtnClass = 'bg-neutral-900 border border-white/5 text-neutral-400 hover:text-blue-400 hover:bg-blue-950/20 hover:border-blue-500/50';
    speedDialTipClass = 'bg-black border border-white/10 text-white';
  } else if (isDiscussLight) {
    plusButtonClass = 'text-white bg-[#EF4444] border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)] rounded-none';
    plusOrbitClass = 'hidden';
    speedDialClass = 'bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] rounded-none';
    speedDialBtnClass = 'bg-white border border-neutral-300 text-black hover:bg-neutral-100 rounded-none';
    speedDialTipClass = 'bg-white border-2 border-black text-black font-mono';
  } else if (isDiscussBlack) {
    plusButtonClass = 'text-white bg-gradient-to-tr from-[#FF007F] via-[#9333EA] to-[#7000FF] shadow-[0_4px_16px_rgba(255,0,127,0.4)] border border-[#FF007F]/20';
    plusOrbitClass = menuOpen 
      ? 'scale-110 blur-md bg-gradient-to-tr from-[#FF007F] via-[#9333EA] to-[#7000FF] opacity-90 animate-spin-slow'
      : 'scale-100 blur-sm bg-gradient-to-tr from-[#FF007F] to-[#7000FF] opacity-40 group-hover:scale-105';
    speedDialClass = 'bg-[#13131A]/95 backdrop-blur-xl border border-[#FF007F]/25 shadow-[0_15px_40px_rgba(0,0,0,0.8),_0_0_12px_rgba(255,0,127,0.1)] rounded-2xl';
    speedDialBtnClass = 'bg-neutral-900/60 border border-[#FF007F]/15 text-[#9090A8] hover:text-[#FF007F] hover:bg-[#FF007F]/10 hover:border-[#FF007F]/50';
    speedDialTipClass = 'bg-[#13131A] border border-[#FF007F]/30 text-white';
  }

  // 4. Lock Icon Colors
  let lockBtnClass = '';
  let lockIconClass = '';
  let lockDotClass = '';

  if (isLockEnabled) {
    if (isLight) {
      lockBtnClass = 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50';
      lockIconClass = 'drop-shadow-[0_1.5px_4px_rgba(16,185,129,0.3)] text-emerald-600';
      lockDotClass = 'bg-emerald-600';
    } else if (isDark) {
      lockBtnClass = 'text-emerald-400 hover:text-emerald-300';
      lockIconClass = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.45)] text-emerald-400';
      lockDotClass = 'bg-emerald-500';
    } else if (isDiscussLight) {
      lockBtnClass = 'text-[#10B981] bg-emerald-50/20 border border-[#10B981] rounded-none';
      lockIconClass = 'text-[#10B981]';
      lockDotClass = 'bg-[#10B981] rounded-none border border-black';
    } else if (isDiscussBlack) {
      lockBtnClass = 'text-[#FF8C00] hover:text-[#FFB84D]';
      lockIconClass = 'drop-shadow-[0_0_8px_rgba(255,140,0,0.5)] text-[#FF8C00]';
      lockDotClass = 'bg-[#FF8C00] shadow-[0_0_6px_#FF8C00]';
    }
  } else {
    // Inactive Lock
    if (isLight) {
      lockBtnClass = 'text-[#64748B] hover:text-neutral-900 hover:bg-neutral-100/80';
      lockIconClass = 'text-[#64748B] group-hover:text-neutral-800';
    } else if (isDark) {
      lockBtnClass = 'text-neutral-400 hover:text-white hover:bg-white/5';
      lockIconClass = 'text-neutral-500 group-hover:text-neutral-300';
    } else if (isDiscussLight) {
      lockBtnClass = 'text-black hover:bg-black/5 rounded-none';
      lockIconClass = 'text-black';
    } else if (isDiscussBlack) {
      lockBtnClass = 'text-[#9090A8] hover:text-white hover:bg-white/5';
      lockIconClass = 'text-[#9090A8] group-hover:text-white';
    }
  }

  return (
    <>
      <div 
        ref={menuRef}
        className={`floating-navbar-container fixed bottom-6 left-1/2 z-50 w-[92%] max-w-[420px] select-none ${
          visible ? 'visible-state' : 'hidden-state'
        }`}
      >
        {/* Main Dock Bar with 5 columns for perfect centering */}
        <div className={`relative grid grid-cols-5 items-center justify-items-center h-[66px] px-2 ${dockContainerClass}`}>
          {/* Top light neon bar accent */}
          <div className={`absolute top-0 left-6 right-6 h-[1px] ${topAccentClass}`} />
          
          {/* Nav Item 1: Feed / Home */}
          <Link 
            to="/feed" 
            className={getNavItemClass('/feed')}
          >
            <Compass className={`w-[22px] h-[22px] transition-transform duration-300 group-hover:rotate-12 ${getIconDropShadow('/feed')}`} />
            {getActiveDot('/feed')}
          </Link>

          {/* Nav Item 2: Chat */}
          <Link 
            to="/chat" 
            className={getNavItemClass('/chat')}
          >
            <MessageSquare className={`w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 ${getIconDropShadow('/chat')}`} />
            
            {/* Dynamic Chat Badge count */}
            {unreadChatCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 min-w-[16px] px-1 items-center justify-center bg-[#DC2626] text-white text-[9px] font-black rounded-full animate-bounce shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}

            {getActiveDot('/chat')}
          </Link>

          {/* Nav Item 3: Plus Button Container */}
          <div className="relative flex items-center justify-center w-12 h-12">
            {/* Speed Dial Menu */}
            <div 
              className={`absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 px-4 py-2.5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] transition-all duration-300 ${speedDialClass} ${
                menuOpen 
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 scale-75 translate-y-6 pointer-events-none'
              }`}
            >
              {/* Create Discussion */}
              <button 
                onClick={() => handleOpenCreateModal('discussion')}
                className={`group relative flex flex-col items-center justify-center w-11 h-11 transition-all active:scale-90 ${isDiscussLight ? 'rounded-none' : 'rounded-xl'} ${speedDialBtnClass}`}
              >
                <MessageSquarePlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                <div className={`absolute -top-8 px-2 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap ${speedDialTipClass}`}>
                  Discussion
                </div>
              </button>

              {/* Create Project */}
              <button 
                onClick={() => handleOpenCreateModal('project')}
                className={`group relative flex flex-col items-center justify-center w-11 h-11 transition-all active:scale-90 ${isDiscussLight ? 'rounded-none' : 'rounded-xl'} ${speedDialBtnClass}`}
              >
                <FolderGit2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                <div className={`absolute -top-8 px-2 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap ${speedDialTipClass}`}>
                  Project
                </div>
              </button>

              {/* Create Pulse */}
              <button 
                onClick={() => handleOpenCreateModal('pulse')}
                className={`group relative flex flex-col items-center justify-center w-11 h-11 transition-all active:scale-90 ${isDiscussLight ? 'rounded-none' : 'rounded-xl'} ${speedDialBtnClass}`}
              >
                <Video className="w-4 h-4 transition-transform group-hover:scale-110" />
                <div className={`absolute -top-8 px-2 py-0.5 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap ${speedDialTipClass}`}>
                  Pulse
                </div>
              </button>
            </div>

            {/* Orbit / Glow ring */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${plusOrbitClass}`} />

            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className={`relative flex items-center justify-center w-11 h-11 border transition-all duration-300 active:scale-90 ${isDiscussLight ? 'rounded-none' : 'rounded-full'} ${plusButtonClass} ${
                menuOpen ? 'rotate-135' : 'hover:scale-105'
              }`}
            >
              {menuOpen ? (
                <X className="w-5 h-5 transition-transform" />
              ) : (
                <Plus className="w-5 h-5 transition-transform" />
              )}
            </button>
          </div>

          {/* Nav Item 4: Pulse Feed */}
          <Link 
            to="/pulse" 
            className={getNavItemClass('/pulse')}
          >
            <Play className={`w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 ${getIconDropShadow('/pulse')}`} />
            {getActiveDot('/pulse')}
          </Link>

          {/* Nav Item 5: Lock / Unlock Security */}
          <button 
            onClick={handleLockClick}
            className={`group relative flex items-center justify-center w-12 h-12 transition-all ${isDiscussLight ? 'rounded-none' : 'rounded-2xl'} ${lockBtnClass}`}
          >
            {isLockEnabled ? (
              <Lock className={`w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 ${lockIconClass}`} />
            ) : (
              <Unlock className={`w-[22px] h-[22px] transition-transform duration-300 group-hover:scale-110 ${lockIconClass}`} />
            )}
            {isLockEnabled && (
              <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full animate-pulse ${lockDotClass}`} />
            )}
          </button>
        </div>
      </div>

      {/* Futuristic Security Tutorial Modal */}
      {showSecurityTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#0D0D12]/95 border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-zoom-in">
            {/* Top red-and-blue glowing accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#DC2626] via-[#9333EA] to-[#2563EB] rounded-t-3xl" />
            
            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-500 animate-pulse">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-md font-bold text-white tracking-wide">Security Shield</h3>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">App Lock System</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSecurityTutorial(false)}
                className="p-1.5 rounded-lg bg-neutral-900 border border-white/5 text-neutral-400 hover:text-white transition-all active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tutorial Body */}
            <div className="space-y-4 text-left">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Secure your discussions, private group chats, and post histories with high-end session locking. To enable:
              </p>

              {/* Step List */}
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold font-mono">1</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Navigate to Profile</p>
                    <p className="text-[10px] text-neutral-400">Click on your profile page.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold font-mono">2</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Configure 6-Digit PIN</p>
                    <p className="text-[10px] text-neutral-400">Set a custom numeric code in the settings panel.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold font-mono">3</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Instant Lock Activation</p>
                    <p className="text-[10px] text-neutral-400">The Lock icon turns active. Tap it to secure instantly.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2.5 mt-6">
              <button 
                onClick={() => {
                  setShowSecurityTutorial(false);
                  navigate('/profile');
                  toast.info('Scroll down to Security Settings to enable App Lock.');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
              >
                Enable App Lock
              </button>
              <button 
                onClick={() => setShowSecurityTutorial(false)}
                className="py-2.5 px-4 rounded-xl bg-neutral-900 border border-white/5 hover:border-white/10 hover:bg-neutral-800 text-xs font-bold text-neutral-400 hover:text-white transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Create Post Modal */}
      <CreatePostModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialType={initialPostType}
        onCreated={() => {
          setShowCreateModal(false);
          if (currentPath !== '/feed') {
            navigate('/feed');
          }
        }}
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
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .rotate-135 {
          transform: rotate(135deg);
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-zoom-in {
          animation: zoom-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}
