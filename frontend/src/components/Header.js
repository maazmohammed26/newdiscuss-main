import { useState } from 'react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import { Cpu, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [showGuidelines, setShowGuidelines] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-md border-b border-white/10 relative select-none">
      {/* Top red-and-blue thick accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between w-full relative">
        {/* Left spacing/placeholder to keep logo centered */}
        <div className="w-8 h-8 md:w-10 md:h-10" />

        <Link to="/" className="flex items-center" data-testid="header-logo">
          <DiscussLogo size="md" />
        </Link>

        {/* Pulsing Small Techie CPU Icon */}
        <button
          onClick={() => setShowGuidelines(true)}
          className="p-1.5 md:p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] hover:text-[#2563EB] dark:hover:text-blue-400 discuss:hover:text-[#EF4444] transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          title="Community Guidelines & Safety"
        >
          <Cpu className="w-4.5 h-4.5 md:w-[18px] md:h-[18px] animate-pulse text-[#2563EB] discuss:text-[#EF4444]" />
        </button>
      </div>

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
    </header>
  );
}
