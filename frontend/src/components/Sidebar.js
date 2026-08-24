import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Home, MessageCircle, Radar, Briefcase, Newspaper, Bookmark, Code, User, Sparkles, Users } from 'lucide-react';
import CreatePostModal from '@/components/CreatePostModal';
import DiscussLogo from '@/components/DiscussLogo';

export default function Sidebar({ onPostCreated, className = "", topClass = "top-[72px]", maxHeightStyle = "calc(100vh - 96px)" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const handlePostCreated = () => {
    setShowCreate(false);
    if (onPostCreated) {
      onPostCreated();
    } else {
      if (location.pathname !== '/feed') {
        navigate('/feed');
      }
    }
  };

  const navItems = [
    { label: 'Home', path: '/feed', icon: Home, isActive: location.pathname === '/feed' },
    { label: 'Chats', path: '/chat', icon: MessageCircle, isActive: location.pathname.startsWith('/chat') || location.pathname.startsWith('/group/') },
    { label: 'Discuss AI', path: '/ai-assistant', icon: Sparkles, isActive: location.pathname === '/ai-assistant', badge: 'AI' },
    { label: 'TalentGraph', path: '/talentgraph', icon: Users, isActive: location.pathname === '/talentgraph' },
    { label: 'DevRadar', path: '/devradar', icon: Radar, isActive: location.pathname === '/devradar' },
    { label: 'Jobs', path: '/jobs', icon: Briefcase, isActive: location.pathname.startsWith('/jobs') },
    { label: 'News', path: '/news', icon: Newspaper, isActive: location.pathname.startsWith('/news') },
    { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark, isActive: location.pathname === '/bookmarks' },
    { label: 'Code Tools', path: '/editor', icon: Code, isActive: location.pathname === '/editor' },
    { label: 'Profile', path: '/profile', icon: User, isActive: location.pathname === '/profile' },
  ];

  return (
    <>
      <aside className={`hidden lg:block w-[240px] shrink-0 sticky ${topClass} self-start z-30 ${className}`}>
        <div 
          className="bg-white dark:bg-black border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-4 shadow-sm space-y-5 overflow-y-auto scrollbar-hide select-none transition-colors duration-200"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxHeight: maxHeightStyle }}
        >
          {/* Brand script logo */}
          <div className="flex items-center justify-start px-3 py-1">
            <DiscussLogo size="md" />
          </div>

          {/* Navigation list */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-[14px] transition-all duration-150 ${
                    item.isActive
                      ? 'bg-neutral-100 dark:bg-[#1A1A1A] text-neutral-900 dark:text-white font-bold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-[#141414] hover:text-neutral-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 ${item.isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-[#0095F6]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Create Post Button */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 rounded-xl bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold text-[14px] shadow-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
          >
            <Plus className="w-5 h-5 stroke-[2.5px]" />
            <span>Create Post</span>
          </button>

          {/* Clean Footer */}
          <div className="pt-4 border-t border-[#EFEFEF] dark:border-[#262626] space-y-2 text-center">
            <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-400 dark:text-neutral-500">
              <Link to="/terms" className="hover:underline">Terms</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:underline">Privacy</Link>
              <span>•</span>
              <Link to="/about" className="hover:underline">About</Link>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Discuss © 2026
            </p>
          </div>
        </div>
      </aside>

      <CreatePostModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handlePostCreated}
      />
    </>
  );
}
