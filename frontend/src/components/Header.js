import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import UserAvatar from '@/components/UserAvatar';
import CreatePostModal from '@/components/CreatePostModal';
import GuestAuthModal from '@/components/GuestAuthModal';
import { 
  Heart, 
  Plus, 
  Menu, 
  X, 
  Newspaper, 
  Briefcase, 
  Code, 
  Bookmark, 
  ShieldCheck, 
  Users, 
  Radar,
  Send,
  Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { unreadChatCount } = useHighlights();

  const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/verify-email'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAppRoute = location.pathname === '/feed' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/') || location.pathname.startsWith('/news') || location.pathname.startsWith('/jobs');
  const isAiChatRoute = location.pathname === '/ai-assistant';
  const hasNavbar = (user || isAppRoute) && !loading && !isPublicRoute && !isAiChatRoute;

  const handlePlusClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  const headerClass = `sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-[#DBDBDB] dark:border-[#262626] select-none transition-colors duration-200 ${
    hasNavbar ? 'md:fixed md:top-0 md:left-0 md:w-full md:pl-[100px] lg:pl-0 md:z-40' : 'w-full'
  }`;

  return (
    <>
      <header className={headerClass}>
        {/* Mobile/Tablet Header: Left (+), Center (Discuss), Right (Heart + Menu) */}
        <div className="lg:hidden max-w-5xl mx-auto px-4 h-12 flex items-center justify-between w-full relative">
          {/* Left: Plus Icon for Create Post */}
          <button
            onClick={handlePlusClick}
            aria-label="Create Post"
            className="p-1.5 text-neutral-900 dark:text-white hover:opacity-70 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.2px]" />
          </button>

          {/* Center: Centered Discuss Script Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center" data-testid="header-logo">
            <DiscussLogo size="md" />
          </Link>

          {/* Right: Heart (Activity/Notifications) & Hamburger Menu */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(user ? '/chat' : '/login')}
              className="relative p-1.5 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity"
              title="Activity"
            >
              <Heart className="w-6 h-6 stroke-[2px]" />
              {unreadChatCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#ED4956] rounded-full ring-2 ring-white dark:ring-black" />
              )}
            </button>

            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="p-1.5 text-neutral-900 dark:text-white hover:opacity-70 transition-opacity"
              title="Menu"
            >
              {showDrawer ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 stroke-[2px]" />}
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex max-w-5xl mx-auto px-6 h-14 items-center justify-between">
          <Link to="/" className="flex items-center" data-testid="desktop-header-logo">
            <DiscussLogo size="lg" />
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePlusClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              <span>Create Post</span>
            </button>

            <button
              onClick={() => setShowGuidelines(true)}
              className="p-2 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Community Guidelines"
            >
              <ShieldCheck className="w-5 h-5 text-[#0095F6]" />
            </button>

            {user ? (
              <Link to="/profile" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full p-[1.5px] ig-story-gradient">
                  <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1px] overflow-hidden">
                    <UserAvatar src={user.photo_url} username={user.username || 'You'} className="w-full h-full object-cover rounded-full" />
                  </div>
                </div>
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-1.5 bg-[#0095F6] text-white text-xs font-bold rounded-lg hover:bg-[#1877F2]">
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Menu Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-black border-l border-[#DBDBDB] dark:border-[#262626] z-50 p-5 flex flex-col justify-between shadow-2xl"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF] dark:border-[#262626]">
                  <DiscussLogo size="md" />
                  <button onClick={() => setShowDrawer(false)} className="p-1 rounded-full text-neutral-500 hover:text-black dark:hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1 text-sm font-medium">
                  <button onClick={() => { navigate('/chat'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Send className="w-5 h-5 text-[#0095F6]" />
                    <span>Direct Messages</span>
                  </button>
                  <button onClick={() => { navigate('/devradar'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Radar className="w-5 h-5 text-indigo-500" />
                    <span>DevRadar</span>
                  </button>
                  <button onClick={() => { navigate('/talentgraph'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Users className="w-5 h-5 text-amber-500" />
                    <span>TalentGraph</span>
                  </button>
                  <button onClick={() => { navigate('/news'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Newspaper className="w-5 h-5 text-emerald-500" />
                    <span>Tech News</span>
                  </button>
                  <button onClick={() => { navigate('/jobs'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <span>Tech Jobs</span>
                  </button>
                  <button onClick={() => { navigate('/bookmarks'); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <Bookmark className="w-5 h-5 text-pink-500" />
                    <span>Saved Posts</span>
                  </button>
                  <button onClick={() => { setShowGuidelines(true); setShowDrawer(false); }} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    <ShieldCheck className="w-5 h-5 text-[#0095F6]" />
                    <span>Community Guidelines</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EFEFEF] dark:border-[#262626]">
                {user ? (
                  <button onClick={() => { navigate('/profile'); setShowDrawer(false); }} className="flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <UserAvatar src={user.photo_url} username={user.username || 'You'} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">@{user.username}</div>
                      <div className="text-[11px] text-neutral-400">View Profile</div>
                    </div>
                  </button>
                ) : (
                  <button onClick={() => { navigate('/login'); setShowDrawer(false); }} className="w-full py-2 bg-[#0095F6] text-white text-xs font-bold rounded-xl text-center">
                    Log In
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Community Guidelines Dialog */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neutral-900 dark:text-white text-base">
              <ShieldCheck className="w-5 h-5 text-[#0095F6]" />
              <span>Discuss Safety & Guidelines</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <p>• <b>Authentic Collaboration</b>: Share original code, projects, and positive constructive feedback.</p>
            <p>• <b>Zero Harassment</b>: Respect fellow builders and creators at all times.</p>
            <p>• <b>AI Moderation</b>: Discuss AI continuously screens content for safety and security.</p>
          </div>
        </DialogContent>
      </Dialog>

      <CreatePostModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <GuestAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}