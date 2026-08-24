import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import UserAvatar from '@/components/UserAvatar';
import { 
  Heart, 
  Send, 
  Menu, 
  X, 
  ChevronRight, 
  Newspaper, 
  Briefcase, 
  Code, 
  Bookmark, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  Users, 
  ShieldCheck, 
  ShieldAlert,
  Search,
  Radar
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHighlights } from '@/contexts/HighlightsContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { unreadChatCount, pendingFriendRequests } = useHighlights();

  const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/verify-email'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAppRoute = location.pathname === '/feed' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/') || location.pathname.startsWith('/news') || location.pathname.startsWith('/jobs');
  const isAiChatRoute = location.pathname === '/ai-assistant';
  const hasNavbar = (user || isAppRoute) && !loading && !isPublicRoute && !isAiChatRoute;

  const headerClass = `sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-[#DBDBDB] dark:border-[#262626] select-none transition-colors duration-200 ${
    hasNavbar ? 'md:fixed md:top-0 md:left-0 md:w-full md:pl-[100px] lg:pl-0 md:z-40' : 'w-full'
  }`;

  return (
    <>
      <header className={headerClass}>
        {/* Mobile/Tablet Header */}
        <div className="lg:hidden max-w-5xl mx-auto px-4 h-14 flex items-center justify-between w-full relative">
          <Link to="/" className="flex items-center" data-testid="header-logo">
            <DiscussLogo size="md" />
          </Link>

          <div className="flex items-center gap-3">
            {/* Direct messages / Chat shortcut */}
            <button
              onClick={() => navigate(user ? '/chat' : '/login')}
              className="relative p-2 rounded-full text-neutral-800 dark:text-neutral-200 hover:opacity-70 transition-opacity"
              title="Messages"
            >
              <Send className="w-5 h-5 -rotate-12" />
              {unreadChatCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#ED4956] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </button>

            {/* Safety guidelines */}
            <button
              onClick={() => setShowGuidelines(true)}
              className="p-2 rounded-full text-neutral-800 dark:text-neutral-200 hover:opacity-70 transition-opacity"
              title="Community Guidelines"
            >
              <ShieldCheck className="w-5 h-5 text-[#0095F6]" />
            </button>

            {/* Menu drawer button */}
            <motion.button
              onClick={() => setShowDrawer(!showDrawer)}
              className="p-2 rounded-full text-neutral-800 dark:text-neutral-200 hover:opacity-70 transition-opacity"
              title="Menu"
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: showDrawer ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {showDrawer ? <X className="w-5 h-5 text-[#ED4956]" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex w-full px-8 h-14 items-center justify-between relative bg-white/90 dark:bg-black/90">
          {/* Logo (Left-aligned) */}
          <Link to="/feed" className="flex items-center gap-1.5">
            <DiscussLogo size="md" />
          </Link>

          {/* Right Side Icons & Profile Dropdown */}
          <div className="flex items-center gap-5">
            {/* Guidelines */}
            <button
              onClick={() => setShowGuidelines(true)}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Community Safety Guidelines"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Chat Icon with Badge */}
            <Link
              to={user ? "/chat" : "/login"}
              className="relative p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Messages"
            >
              <Send className="w-5 h-5 -rotate-12" />
              {unreadChatCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#ED4956] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none group cursor-pointer select-none">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[#DBDBDB] dark:border-[#262626] group-hover:border-[#0095F6] transition-colors">
                      <UserAvatar src={user?.photo_url || null} username={user?.username || 'Guest'} className="w-full h-full object-cover" />
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] text-neutral-900 dark:text-white shadow-xl rounded-xl p-1.5">
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-[#EFEFEF] dark:border-[#262626] mb-1">
                        <p className="text-[11px] text-neutral-400 font-medium">Signed in as</p>
                        <p className="text-sm font-bold truncate text-neutral-900 dark:text-white">@{user.username}</p>
                      </div>
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#1F1F1F]">
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/bookmarks')} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#1F1F1F]">
                        Bookmarks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/editor')} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#1F1F1F]">
                        Code Tools
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#EFEFEF] dark:bg-[#262626] my-1" />
                      <DropdownMenuItem onClick={() => {
                        const { signOutUser } = require('@/lib/db');
                        signOutUser().then(() => {
                          navigate('/login');
                        });
                      }} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-[#ED4956] hover:bg-[#ED4956]/10">
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/login')} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#1F1F1F]">
                        Sign In
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/register')} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#1F1F1F] text-[#0095F6]">
                        Create Account
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-Out Drawer for Mobile */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs block lg:hidden"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-[290px] h-full flex flex-col justify-between border-l shadow-2xl p-5 block lg:hidden
                bg-white text-neutral-900 border-[#DBDBDB]
                dark:bg-[#121212] dark:text-neutral-50 dark:border-[#262626]"
            >
              <div className="space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF] dark:border-[#262626]">
                  <DiscussLogo size="sm" />
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      setShowGuidelines(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#0095F6]">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Safety Guidelines</h4>
                      <p className="text-[11px] text-neutral-500">Community rules</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/news');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Newspaper className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Tech News</h4>
                      <p className="text-[11px] text-neutral-500">Latest articles</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/jobs');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Careers & Jobs</h4>
                      <p className="text-[11px] text-neutral-500">Developer roles</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/ai-assistant');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Discuss AI</h4>
                      <p className="text-[11px] text-neutral-500">Smart assistant</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/devradar');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                      <Radar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">DevRadar</h4>
                      <p className="text-[11px] text-neutral-500">Trending tech</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/talentgraph');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">TalentGraph</h4>
                      <p className="text-[11px] text-neutral-500">Developer connections</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/editor');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Code className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Code Playground</h4>
                      <p className="text-[11px] text-neutral-500">Run code</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      if (!user) navigate('/login');
                      else navigate('/bookmarks');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Bookmark className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[14px]">Bookmarks</h4>
                      <p className="text-[11px] text-neutral-500">Saved posts</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EFEFEF] dark:border-[#262626] flex items-center justify-between text-xs text-neutral-400">
                <span className="font-script text-lg text-neutral-900 dark:text-white">Discuss</span>
                <span>© 2026</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Guidelines Modal */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0095F6] shrink-0" />
              <span>Discuss Safety & Guidelines</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              We strive to keep Discuss a professional, respectful, and productive community for tech builders.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="bg-neutral-50 dark:bg-black/50 rounded-xl p-3.5 border border-[#EFEFEF] dark:border-[#262626] space-y-2">
              <h4 className="text-xs font-bold text-[#0095F6]">
                Community Standards
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Be kind, respectful, and collaborative. Do not share copyrighted code without permission or post deceptive content.
              </p>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
                <div>• Click <b>three dots (...)</b> on any post or comment to report violations.</div>
                <div>• Flag inappropriate user behavior directly from profile cards.</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-neutral-600 dark:text-neutral-400">
              <ShieldAlert className="w-4 h-4 text-[#ED4956] shrink-0 mt-0.5" />
              <span>Reports are analyzed by Discuss AI and reviewed by our moderation team within 24 hours.</span>
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button
              onClick={() => setShowGuidelines(false)}
              className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-xl py-2 font-semibold transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {hasNavbar && <div className="hidden md:block h-14" />}
    </>
  );
}
