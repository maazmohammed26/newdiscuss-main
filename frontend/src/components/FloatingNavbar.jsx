import { useState, useEffect, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import UserAvatar from '@/components/UserAvatar';
import { Home, Clapperboard, Send, Search } from 'lucide-react';

function FloatingNavbar() {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadChatCount, pendingFriendRequests } = useHighlights();
  const [domLoading, setDomLoading] = useState(false);

  useEffect(() => {
    const checkLoader = () => {
      const hasLoader = !!document.getElementById('discuss-loading-screen') || 
                        !!document.getElementById('discuss-story-viewer') || 
                        !!document.querySelector('.bg-black.z-50') || 
                        (document.body?.innerText?.includes('Loading your feed...'));
      setDomLoading(Boolean(hasLoader));
    };

    checkLoader();
    const interval = setInterval(checkLoader, 250);
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

  const navItems = [
    { key: 'home', to: '/feed', active: currentPath === '/feed', icon: Home, label: 'Home' },
    { key: 'pulse', to: '/pulse', active: currentPath === '/pulse', icon: Clapperboard, label: 'Pulse' },
    { key: 'chats', to: '/chat', active: currentPath.startsWith('/chat'), icon: Send, label: 'Chats', badge: unreadChatCount },
    { key: 'search', to: '/search', active: currentPath === '/search', icon: Search, label: 'Search' },
    { key: 'profile', to: user ? '/profile' : '/login', active: currentPath === '/profile', label: 'Profile' },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t border-[#E5E5E5] dark:border-[#262626] transition-colors duration-200 select-none pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="h-[49px] max-w-lg mx-auto px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.active;
          const Icon = item.icon;

          if (item.key === 'profile') {
            return (
              <Link
                key={item.key}
                to={item.to}
                aria-label={item.label}
                className="relative flex items-center justify-center p-1.5 focus:outline-none"
              >
                <div className={`w-[26px] h-[26px] rounded-full p-[1px] transition-transform duration-100 active:scale-90 ${
                  isActive ? 'ring-2 ring-neutral-900 dark:ring-white' : ''
                }`}>
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <UserAvatar
                      src={user?.photo_url}
                      username={user?.username || 'You'}
                      userId={user?.id}
                      priority
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                {pendingFriendRequests > 0 && (
                  <span
                    aria-label={`${pendingFriendRequests} pending requests`}
                    className="absolute -top-0.5 right-0 min-w-[15px] h-[15px] px-1 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold leading-none flex items-center justify-center shadow-xs"
                  >
                    {pendingFriendRequests > 99 ? '99+' : pendingFriendRequests}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.to}
              aria-label={item.label}
              className="relative flex items-center justify-center p-2 text-neutral-900 dark:text-white transition-transform duration-100 active:scale-90 focus:outline-none"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-all duration-150 ${
                  isActive
                    ? 'stroke-[2.5px] text-neutral-950 dark:text-white'
                    : 'stroke-[1.8px] text-neutral-500 dark:text-neutral-400 opacity-90'
                }`}
              />
              {item.badge > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-[#ED4956] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(FloatingNavbar);
