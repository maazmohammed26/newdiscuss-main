import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Home, MessageCircle, Radar, Briefcase, Newspaper, Bookmark, Code, User, Sparkles } from 'lucide-react';
import CreatePostModal from '@/components/CreatePostModal';

export default function Sidebar({ onPostCreated, className = "", topClass = "top-[72px]", maxHeightStyle = "calc(100vh - 96px)" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const handlePostCreated = () => {
    setShowCreate(false);
    if (onPostCreated) {
      onPostCreated();
    } else {
      // If we are not on feed page, redirecting to feed is a good fallback
      if (location.pathname !== '/feed') {
        navigate('/feed');
      }
    }
  };

  return (
    <>
      <aside className={`hidden lg:block w-[240px] shrink-0 sticky ${topClass} self-start z-30 ${className}`}>
        <div 
          className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-5 shadow-card space-y-6 overflow-y-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxHeight: maxHeightStyle }}
        >
          {/* Logo in dark text */}
          <div className="flex items-center justify-center py-2 select-none">
            <span className="font-heading font-black italic select-none tracking-tight text-3xl">
              <span className="text-[#E53E3E] font-black">&lt;</span>
              <span className="text-neutral-900 dark:text-white font-extrabold tracking-tight">discuss</span>
              <span className="text-[#3182CE] font-black">&gt;</span>
            </span>
          </div>

          {/* Navigation list */}
          <nav className="flex flex-col gap-1">
            <Link
              to="/feed"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/feed'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span>Home</span>
            </Link>

            <Link
              to="/chat"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname.startsWith('/chat') || location.pathname.startsWith('/group/')
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>Chats</span>
            </Link>

            <Link
              to="/ai-assistant"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/ai-assistant'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#8B5CF6] discuss:text-[#A78BFA]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-[#8B5CF6] dark:hover:text-[#A78BFA]'
              }`}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>Discuss AI</span>
            </Link>

            <Link
              to="/devradar"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/devradar'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Radar className="w-5 h-5 shrink-0" />
              <span>DevRadar</span>
            </Link>

            <Link
              to="/jobs"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname.startsWith('/jobs')
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-5 h-5 shrink-0" />
              <span>Jobs</span>
            </Link>

            <Link
              to="/news"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname.startsWith('/news')
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Newspaper className="w-5 h-5 shrink-0" />
              <span>News</span>
            </Link>

            <Link
              to="/bookmarks"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/bookmarks'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-5 h-5 shrink-0" />
              <span>Bookmarks</span>
            </Link>

            <Link
              to="/editor"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/editor'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-5 h-5 shrink-0" />
              <span>Code Tools</span>
            </Link>

            <Link
              to="/profile"
              className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-[14px] font-bold transition-all ${
                location.pathname === '/profile'
                  ? 'bg-neutral-100 dark:bg-neutral-900 discuss:bg-black/40 text-[#2563EB] discuss:text-[#EF4444]'
                  : 'text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:bg-neutral-50 dark:hover:bg-neutral-900/50 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              <span>Profile</span>
            </Link>
          </nav>

          {/* Create Post pill button */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white font-bold text-[14px] shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
          >
            <Plus className="w-5 h-5" />
            <span>Create Post</span>
          </button>

          {/* Footer */}
          <div className="pt-6 border-t border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] space-y-4">
            <div className="flex flex-col items-center select-none">
              <span className="font-heading font-black italic select-none tracking-tight text-lg mb-1">
                <span className="text-[#E53E3E] font-black">&lt;</span>
                <span className="text-neutral-800 dark:text-[#E5E7EB] font-extrabold tracking-tight">discuss</span>
                <span className="text-[#3182CE] font-black">&gt;</span>
              </span>
              <p className="text-[11px] text-neutral-400 font-medium font-sans">Discuss © 2026</p>
              <p className="text-[11px] text-neutral-400 font-medium font-sans">All rights reserved.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[11px] font-bold text-[#64748B] dark:text-neutral-500 discuss:text-[#9CA3AF] hover:text-neutral-600">
              <Link to="/terms" className="hover:underline">Terms</Link>
              <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
              <Link to="/terms" className="hover:underline">User Agreement</Link>
              <button onClick={() => navigate('/feed', { state: { openGuidelines: true } })} className="hover:underline cursor-pointer focus:outline-none bg-transparent border-none p-0 text-inherit font-inherit">Accessibility</button>
            </div>
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
