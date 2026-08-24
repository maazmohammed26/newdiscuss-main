import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import UserAvatar from '@/components/UserAvatar';
import ExploreMenuModal from '@/components/ExploreMenuModal';
import {
  Home,
  Tv,
  Send,
  Search,
  Clapperboard
} from 'lucide-react';

export default function FloatingNavbar() {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadChatCount } = useHighlights();
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [domLoading, setDomLoading] = useState(false);

  useEffect(() => {
    const checkLoader = () => {
      const hasLoader = !!document.getElementById('discuss-loading-screen') || 
                        !!document.getElementById('discuss-story-viewer') || 
                        !!document.querySelector('.bg-black.z-50') || 
                        (document.body && document.body.innerText && document.body.innerText.includes('Loading your feed...'));
      setDomLoading(hasLoader);
    };

    checkLoader();
    const interval = setInterval(checkLoader, 200);
    return () => clearInterval(interval);
  }, []);

  const currentPath = location.pathname;
  const pathParts = currentPath.split('/').filter(Boolean);
  
  const isInsideChatRoom = pathParts[0] === 'chat' && pathParts.length > 1;
  const isInsideGroupRoom = pathParts[0] === 'group' && pathParts.length > 1;
  const isInsidePulseRoom = pathParts[0] === 'pulse';

  if (isInsideChatRoom || isInsideGroupRoom || isInsidePulseRoom || domLoading) {
    return null;
  }

  // 5 exact Instagram bottom items: Home, Pulse/Reels, Chats/Messages, Search/Explore, Profile
  const navItems = [
    { key: 'home', to: '/feed', active: currentPath === '/feed', icon: Home, label: 'Home' },
    { key: 'pulse', to: '/pulse', active: currentPath === '/pulse', icon: Clapperboard, label: 'Pulse' },
    { key: 'chats', to: '/chat', active: currentPath.startsWith('/chat'), icon: Send, label: 'Chats', badge: unreadChatCount },
    { key: 'search', action: () => setShowExploreModal(true), active: ['/devradar', '/news', '/jobs', '/editor', '/bookmarks', '/talentgraph'].includes(currentPath), icon: Search, label: 'Search' },
    { key: 'profile', to: user ? '/profile' : '/login', active: currentPath === '/profile', label: 'Profile' },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed z-50 pointer-events-auto select-none left-1/2 -translate-x-1/2 w-[94%] max-w-[420px]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="relative h-[56px] w-full px-3 rounded-full bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-[#DBDBDB] dark:border-[#262626] shadow-[0_8px_32px_rgba(0,0,0,0.14)] flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.active;
            const Icon = item.icon;

            if (item.key === 'profile') {
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-label={item.label}
                  className="relative flex items-center justify-center p-1.5 cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-full p-[1.5px] transition-transform duration-150 active:scale-90 ${
                    isActive 
                      ? 'ring-2 ring-neutral-900 dark:ring-white' 
                      : ''
                  }`}>
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <UserAvatar
                        src={user?.photo_url}
                        username={user?.username || 'You'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </Link>
              );
            }

            const content = (
              <div className="relative flex items-center justify-center p-2 text-neutral-900 dark:text-white transition-transform active:scale-90 cursor-pointer">
                <Icon
                  className={`w-6 h-6 ${
                    isActive 
                      ? 'stroke-[2.6px] text-neutral-950 dark:text-white' 
                      : 'stroke-[1.8px] text-neutral-600 dark:text-neutral-400 opacity-85'
                  }`}
                />
                {item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-1 bg-[#ED4956] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
            );

            if (item.action) {
              return (
                <button
                  key={item.key}
                  onClick={item.action}
                  aria-label={item.label}
                  className="focus:outline-none"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                aria-label={item.label}
                className="focus:outline-none"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      <ExploreMenuModal
        open={showExploreModal}
        onClose={() => setShowExploreModal(false)}
      />
    </>
  );
}