import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Radar, Newspaper, Briefcase, ChevronRight } from 'lucide-react';
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
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Tech News',
      description: 'Latest updates from the community',
      icon: Newspaper,
      path: '/news',
      requiresAuth: false,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10'
    },
    {
      title: 'Jobs',
      description: 'Find your next career move',
      icon: Briefcase,
      path: '/jobs',
      requiresAuth: false,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] p-0 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#333333]">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">Explore</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1">Discover more features on Discuss</p>
        </div>
        <div className="p-2">
          {exploreItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handleNavigate(item.path, item.requiresAuth)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 discuss:hover:bg-[#262626] transition-colors rounded-xl text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] group-hover:text-[#2563EB] discuss:group-hover:text-[#EF4444] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 discuss:text-[#404040] group-hover:translate-x-1 transition-transform" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
