import React from 'react';
import { Button } from '@/components/ui/button';

export const INTRO_STORAGE_KEY = 'discuss_blink_intro_seen';

export default function BlinkIntroModal({ onContinue, onClose }) {
  const handleAcknowledge = () => {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      // Handle private storage exceptions silently
    }
    onContinue();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blink-intro-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white dark:bg-neutral-950 p-6 sm:p-7 shadow-2xl transition-all">
        <h2
          id="blink-intro-title"
          className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
        >
          Blink
        </h2>

        <p className="mt-3.5 text-[14.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          Blink lets you capture a private photo and send it directly to selected friends or groups. Each person can view it once, and Blink media automatically expires after 24 hours. Once sent, it cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl px-4 text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAcknowledge}
            className="rounded-xl bg-[#0095F6] px-5 text-sm font-bold text-white hover:bg-[#1877F2] shadow-sm"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
