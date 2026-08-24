import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LogIn, UserPlus } from 'lucide-react';

export default function GuestAuthModal({ open, onClose, title = "Join the conversation", description = "Sign in or create an account to interact with this post and join the community." }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    onClose();
    navigate(path, { state: { from: location } });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[400px] w-[95vw] rounded-[16px] bg-white dark:bg-neutral-900  border border-neutral-200 dark:border-neutral-800 dark:border-[#262626] p-0 overflow-hidden shadow-2xl [&::-webkit-scrollbar]:hidden">
        <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-6">
          
          {/* Logo / Branding */}
          <div className="flex items-center justify-center font-black text-3xl md:text-4xl tracking-tight mb-2">
            <span className="text-[#EF4444]">&lt;</span>
            <span className="text-[#0095F6]">discuss</span>
            <span className="text-[#EF4444]">/&gt;</span>
          </div>

          <DialogHeader className="space-y-3 w-full">
            <DialogTitle className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 dark:text-white text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[14px] md:text-[15px] text-neutral-500 dark:text-neutral-400 discuss:text-neutral-400 text-center">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col w-full gap-3 pt-4">
            <button
              onClick={() => handleNavigation('/register')}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold text-[15px] transition-all shadow-[0_4px_14px_0_rgb(37,99,235,0.39)]"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </button>
            <button
              onClick={() => handleNavigation('/login')}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 dark:bg-black hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:hover:bg-[#1A1A1A] text-neutral-900 dark:text-white dark:text-white font-semibold text-[15px] border border-neutral-200 dark:border-neutral-700 dark:border-[#262626] transition-all"
            >
              <LogIn className="w-5 h-5" />
              Log In
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
