import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import UserAvatar from '@/components/UserAvatar';
import { Cpu, ShieldAlert, ShieldCheck, Menu, X, ChevronRight, Newspaper, Briefcase, Code, Bookmark, HelpCircle, ChevronDown, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Dynamic public vs app route detection to match App.js navbar layout offsets
  const publicRoutes = ['/', '/about', '/careers', '/blogs', '/contact', '/login', '/register', '/terms', '/privacy', '/verify-email'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isAppRoute = location.pathname === '/feed' || location.pathname.startsWith('/post/') || location.pathname.startsWith('/user/') || location.pathname.startsWith('/news') || location.pathname.startsWith('/jobs');
  const isAiChatRoute = location.pathname === '/ai-assistant';
  const hasNavbar = (user || isAppRoute) && !loading && !isPublicRoute && !isAiChatRoute;

  const headerClass = `sticky top-0 z-40 bg-black/75 backdrop-blur-md border-b border-white/10 select-none transition-all duration-300 ${
    hasNavbar ? 'md:fixed md:top-0 md:left-0 md:w-full md:pl-[100px] lg:pl-0 md:z-40' : 'w-full'
  }`;

  return (
    <>
      <header className={headerClass}>
        {/* Top red-and-blue thick accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

        {/* Mobile/Tablet Header (hidden on desktop) */}
        <div className="lg:hidden max-w-5xl mx-auto px-4 h-14 flex items-center justify-between w-full relative">
          <div className="hidden md:block w-8 h-8 md:w-10 md:h-10" />

          <Link to="/" className="flex items-center md:absolute md:left-1/2 md:-translate-x-1/2" data-testid="header-logo">
            <DiscussLogo size="md" />
          </Link>

          <button
            onClick={() => setShowGuidelines(true)}
            className="hidden md:block p-1.5 md:p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] hover:text-[#2563EB] dark:hover:text-blue-400 discuss:hover:text-[#EF4444] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
            title="Community Guidelines & Safety"
          >
            <Cpu className="w-4.5 h-4.5 md:w-[18px] md:h-[18px] animate-pulse text-[#2563EB] discuss:text-[#EF4444]" />
          </button>

          <motion.button
            onClick={() => setShowDrawer(!showDrawer)}
            className="block md:hidden p-2 rounded-xl border transition-all duration-200 active:scale-90 shadow-sm
              bg-neutral-900/60 text-neutral-400 border-white/10 hover:text-white hover:border-white/20
              discuss:bg-black/50 discuss:text-[#9CA3AF] discuss:border-white/5 discuss:hover:text-[#EF4444]"
            title="Menu"
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: showDrawer ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              {showDrawer ? <X className="w-5 h-5 text-red-500" /> : <Menu className="w-5 h-5 text-neutral-300" />}
            </motion.div>
          </motion.button>
        </div>

        {/* Desktop Header (hidden on mobile/tablet) */}
        <div className="hidden lg:flex w-full px-8 h-14 items-center justify-between relative bg-[#0D0D12]">
          {/* Logo (Left-aligned) */}
          <Link to="/feed" className="flex items-center gap-1">
            <span className="font-heading font-black italic select-none tracking-tight text-2xl">
              <span className="text-[#E53E3E] font-black">&lt;</span>
              <span className="text-white font-extrabold tracking-tight">discuss</span>
              <span className="text-[#3182CE] font-black">&gt;</span>
            </span>
          </Link>

          {/* Right Side Icons & Profile Dropdown */}
          <div className="flex items-center gap-6">
            {/* Help/Guidelines icon */}
            <button
              onClick={() => setShowGuidelines(true)}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-300 transition-colors focus:outline-none cursor-pointer"
              title="Help & Guidelines"
            >
              <HelpCircle className="w-5.5 h-5.5 text-white" />
            </button>
            
            {/* User Dropdown */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none group cursor-pointer select-none">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 group-hover:border-white/40 transition-colors">
                      <UserAvatar src={user?.photo_url || null} username={user?.username || 'Guest'} className="w-full h-full object-cover" />
                    </div>
                    <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-[#333333] text-white">
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-[#333333]">
                        <p className="text-xs text-neutral-400">Signed in as</p>
                        <p className="text-sm font-semibold truncate">{user.username}</p>
                      </div>
                      <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer hover:bg-[#262626] text-xs">
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/editor')} className="cursor-pointer hover:bg-[#262626] text-xs">
                        Code Tools
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/bookmarks')} className="cursor-pointer hover:bg-[#262626] text-xs">
                        Bookmarks
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#333333]" />
                      <DropdownMenuItem onClick={() => {
                        const { signOutUser } = require('@/lib/db');
                        signOutUser().then(() => {
                          navigate('/login');
                        });
                      }} className="cursor-pointer text-red-400 hover:bg-[#262626] hover:text-red-300 text-xs">
                        Sign Out
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/login')} className="cursor-pointer hover:bg-[#262626] text-xs">
                        Sign In
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/register')} className="cursor-pointer hover:bg-[#262626] text-xs">
                        Register
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Curved Matte-Finished Slide-Out Drawer (Right Side) - Moved OUTSIDE the <header> to bypass backdrop-filter stacking clipping */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs block md:hidden"
            />

            {/* Curved Matte "Half-Box" Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-[280px] h-full flex flex-col justify-between rounded-l-[32px] border-l shadow-2xl p-6 block md:hidden
                bg-[#fbfcfd] text-neutral-900 border-neutral-200/80
                dark:bg-[#0c0c12] dark:text-neutral-50 dark:border-neutral-800/80
                discuss:bg-[#0c0c12] discuss:text-neutral-100 discuss:border-white/5"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 discuss:border-white/5">
                  <span className="text-[10px] font-black tracking-widest text-[#2563EB] discuss:text-[#EF4444] font-mono">
                    // DIRECTORY
                  </span>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 discuss:border-white/5 text-neutral-400 hover:text-[#2563EB] dark:hover:text-blue-400 discuss:hover:text-[#EF4444] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 group"
                    title="Go Back"
                  >
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* High-Fidelity Techie Navigation Links */}
                <div className="space-y-3.5">
                  {/* Safety Guidelines */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      setShowGuidelines(true);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Safety Guidelines
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Community rules & safety
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Tech News */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/news');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                        <Newspaper className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Tech News
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Latest tech articles
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Jobs */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/jobs');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                        <Briefcase className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Careers & Jobs
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Find developer roles
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Code Playground / Dev Tool */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/editor');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                        <Code className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Code Playground
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Run and edit code
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Discuss AI Assistant */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      navigate('/ai-assistant');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#8B5CF6]/5 hover:bg-[#8B5CF6]/10 border border-[#8B5CF6]/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] group-hover:scale-110 transition-transform">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Discuss AI
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Your smart assistant
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Bookmarks */}
                  <button
                    onClick={() => {
                      setShowDrawer(false);
                      if (!user) {
                        navigate('/login');
                      } else {
                        navigate('/bookmarks');
                      }
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 text-left transition-all duration-200 group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 group-hover:scale-110 transition-transform">
                        <Bookmark className="w-4.5 h-4.5 animate-pulse-subtle" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono">
                          Bookmarks
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium font-sans">
                          Your saved developer posts
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer Techie Details */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 discuss:border-white/5 flex items-center justify-between font-mono">
                <span className="text-[12px] font-extrabold tracking-widest text-[#2563EB] discuss:text-[#EF4444] select-none">
                  {"<discuss/>"}
                </span>
                <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500">
                  v2.4
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Professional Guidelines Dialog */}
      <Dialog open={showGuidelines} onOpenChange={setShowGuidelines}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl bg-white dark:bg-neutral-900 discuss:bg-[#121212] border border-neutral-200 dark:border-neutral-800 discuss:border-[#262626] shadow-2xl p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />
          
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-extrabold text-neutral-900 dark:text-neutral-50 discuss:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444] shrink-0" />
              <span>Discuss Safety & Integrity</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400 discuss:text-neutral-400 leading-relaxed font-medium">
              We strive to build a professional, clean, and respectful ecosystem for tech innovators worldwide. Let's work together to protect our hub.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 no-copy">
            <div className="bg-neutral-50 dark:bg-neutral-800/40 discuss:bg-[#1a1a1a] rounded-xl p-4 border border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] discuss:text-[#EF4444]">
                ◈ Guidelines for Reporting
              </h4>
              <p className="text-[13px] text-neutral-600 dark:text-neutral-300 discuss:text-neutral-300 leading-relaxed font-medium">
                If you encounter content that disrupts the community, leaks private details, contains abusive language, or violates professional norms, please flag it immediately.
              </p>
              <div className="text-[12px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-400 space-y-1.5 font-medium">
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 font-bold shrink-0">1.</span>
                  <span>Click options menu (<b>three dots</b>) on Discussion, Project, or Pulse Video posts.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 font-bold shrink-0">2.</span>
                  <span>Click the <b>flag icon</b> on any user's profile info next to connection button.</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-[12px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-400 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>Reports are sent to our automated developer bot, checked by administration, and resolved within 24 hours. Spam reporting is strictly prohibited.</span>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={() => setShowGuidelines(false)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white rounded-xl py-2.5 h-11 font-bold shadow-md transition-all active:scale-95"
            >
              Acknowledge & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {hasNavbar && <div className="hidden md:block h-14" />}
    </>
  );
}
