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
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#1E293B] dark:bg-black border-[#E2E8F0] dark:border-[#334155] dark:border-[#262626]">
          <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          </div>
          <DialogHeader>
            <DialogTitle className="text-neutral-900 dark:text-neutral-50 dark:text-white text-xl font-bold">
              Sign up or Log in
            </DialogTitle>
            <DialogDescription className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 pt-2">
              For more jobs like <strong>{jobTitle}</strong>, sign up or log in to Discuss. You'll be able to connect with developers, share projects, and stay updated.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => {
                onClose();
                setShowAuthModal(true);
              }}
              className="w-full bg-[#0095F6] bg-[#0095F6] text-white hover:bg-[#1877F2] hover:bg-[#1877F2] rounded-xl py-6 font-semibold text-md shadow-button"
            >
              Log In / Sign Up
            </Button>
            <Button
              onClick={() => {
                onSkip();
                onClose();
              }}
              variant="outline"
              className="w-full border-neutral-200 dark:border-neutral-700 dark:border-[#262626] text-neutral-600 dark:text-neutral-300 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:bg-[#1A1A1A] rounded-xl py-6 font-semibold"
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
