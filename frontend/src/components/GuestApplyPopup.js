import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import GuestAuthModal from './GuestAuthModal';
import { useState } from 'react';

export default function GuestApplyPopup({ open, onClose, onSkip, jobTitle }) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
          <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          </div>
          <DialogHeader>
            <DialogTitle className="text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-xl font-bold">
              Sign up or Log in
            </DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] pt-2">
              For more jobs like <strong>{jobTitle}</strong>, sign up or log in to Discuss. You'll be able to connect with developers, share projects, and stay updated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                onClose();
                setShowAuthModal(true);
              }}
              className="w-full bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] rounded-xl py-6 font-semibold text-md shadow-button"
            >
              Log In / Sign Up
            </Button>
            <Button
              onClick={() => {
                onSkip();
                onClose();
              }}
              variant="outline"
              className="w-full border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-600 dark:text-neutral-300 discuss:text-[#F5F5F5] hover:bg-neutral-50 dark:hover:bg-neutral-800 discuss:hover:bg-[#262626] rounded-xl py-6 font-semibold"
            >
              Skip for now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <GuestAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
