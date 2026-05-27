import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Radar, Newspaper, Briefcase, ChevronRight, Code, Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ExploreMenuModal({ open, onClose, onRequireAuth }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = (path, requiresAuth) => {
    if (requiresAuth && !user) {
      onClose();
      onRequireAuth();
      return;
    }
    onClose();
    navigate(path);
  };

  const exploreItems = [
    {
      title: 'DevRadar',
      description: 'Discover developers nearby on the map',
      icon: Radar,
      path: '/devradar',
      requiresAuth: true,
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      glow: 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]',
      hoverBorder: 'hover:border-blue-500/30 dark:hover:border-blue-500/20',
      hoverBg: 'hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.06]',
      badge: 'MAP_NODE'
    },
    {
      title: 'Tech News',
      description: 'Latest updates from the tech community',
      icon: Newspaper,
      path: '/news',
      requiresAuth: false,
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      glow: 'group-hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]',
      hoverBorder: 'hover:border-indigo-500/30 dark:hover:border-indigo-500/20',
      hoverBg: 'hover:bg-indigo-500/[0.04] dark:hover:bg-indigo-500/[0.06]',
      badge: 'LIVE_FEED'
    },
    {
      title: 'Careers & Jobs',
      description: 'Find your next developer role',
      icon: Briefcase,
      path: '/jobs',
      requiresAuth: false,
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      glow: 'group-hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]',
      hoverBorder: 'hover:border-purple-500/30 dark:hover:border-purple-500/20',
      hoverBg: 'hover:bg-purple-500/[0.04] dark:hover:bg-purple-500/[0.06]',
      badge: 'CAREERS'
    },
    {
      title: 'Code Playground',
      description: 'Real-time multi-language editor',
      icon: Code,
      path: '/editor',
      requiresAuth: false,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      glow: 'group-hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      hoverBorder: 'hover:border-emerald-500/30 dark:hover:border-emerald-500/20',
      hoverBg: 'hover:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.06]',
      badge: 'SANDBOX'
    },
    {
      title: 'Bookmarks Hub',
      description: 'Your saved offline developer posts',
      icon: Bookmark,
      path: '/bookmarks',
      requiresAuth: true,
      color: 'text-yellow-500 dark:text-yellow-400',
      bg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
      glow: 'group-hover:shadow-[0_0_15px_rgba(234,179,8,0.25)]',
      hoverBorder: 'hover:border-yellow-500/30 dark:hover:border-yellow-500/20',
      hoverBg: 'hover:bg-yellow-500/[0.04] dark:hover:bg-yellow-500/[0.06]',
      badge: 'OFFLINE'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[430px] rounded-3xl bg-white/95 dark:bg-[#0c0c12]/95 discuss:bg-[#0c0c12]/95 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 discuss:border-white/5 p-0 overflow-hidden shadow-2xl animate-fade-in">
        {/* Glowing high-tech top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#2563EB] via-[#8B5CF6] to-[#EF4444]" />

        <div className="p-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 discuss:border-white/5 relative">
          <span className="text-[10px] font-black tracking-widest text-[#2563EB] discuss:text-[#EF4444] font-mono block mb-1 select-none">
            ◈ SYSTEM_GATEWAY
          </span>
          <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-50 discuss:text-white leading-none">
            Explore Discuss
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-2.5 font-medium leading-relaxed">
            Access advanced node services and developer tools
          </p>
        </div>

        <div className="p-3 space-y-1">
          {exploreItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handleNavigate(item.path, item.requiresAuth)}
                className={`w-full flex items-center justify-between p-3.5 border border-transparent rounded-2xl transition-all duration-300 text-left group active:scale-[0.98] ${item.hoverBorder} ${item.hoverBg}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-2.5 rounded-xl ${item.bg} ${item.color} transition-all duration-300 ${item.glow} group-hover:scale-110 shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-[13.5px] text-neutral-800 dark:text-neutral-100 discuss:text-neutral-100 font-mono group-hover:text-[#2563EB] discuss:group-hover:text-[#EF4444] transition-colors leading-tight">
                        {item.title}
                      </h3>
                      {item.badge && (
                        <span className="text-[8.5px] font-extrabold font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800/80 discuss:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 border border-neutral-200/50 dark:border-neutral-700/50 discuss:border-white/5 uppercase select-none">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1.5 truncate font-sans font-medium">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 discuss:text-[#404040] group-hover:text-[#2563EB] discuss:group-hover:text-[#EF4444] group-hover:translate-x-1.5 transition-all duration-300 shrink-0" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
