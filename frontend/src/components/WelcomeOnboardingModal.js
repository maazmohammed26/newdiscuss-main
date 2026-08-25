import { ArrowRight, Bell, Moon, Palette, Sun } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DiscussLogo from '@/components/DiscussLogo';

export default function WelcomeOnboardingModal({ open, onClose, onThemeSettings, onNotificationSettings }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[28px] border-neutral-200 bg-white p-0 text-neutral-950 shadow-[0_28px_90px_rgba(15,23,42,.22)] sm:max-w-md" hideClose>
        <div className="h-1 bg-gradient-to-r from-[#ED4956] via-[#8B5CF6] to-[#0095F6]" />
        <div className="p-6 sm:p-8">
          <DialogHeader className="text-left">
            <div className="mb-6 flex items-center justify-between">
              <DiscussLogo size="md" tagged />
              <span className="rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-black tracking-[.12em] text-white">2.0</span>
            </div>
            <DialogTitle className="text-3xl font-black tracking-[-.045em]">A cleaner Discuss starts here.</DialogTitle>
            <p className="pt-3 text-sm leading-6 text-neutral-600">Light mode is now the default for a faster, calmer, and more consistent experience. Public pages, sign in, and sign up always stay light.</p>
          </DialogHeader>

          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-[#FAFAFA]">
            <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-500 shadow-sm"><Sun className="h-4 w-4" /></div>
              <div><p className="text-sm font-bold">Light by default</p><p className="mt-0.5 text-xs text-neutral-500">Optimized for everyday reading and creation.</p></div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-950 text-white shadow-sm"><Moon className="h-4 w-4" /></div>
              <div><p className="text-sm font-bold">Dark mode remains available</p><p className="mt-0.5 text-xs text-neutral-500">It applies only inside your signed-in app.</p></div>
            </div>
            <div className="flex items-center gap-3 border-t border-neutral-200 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF6FF] text-[#0095F6] shadow-sm"><Bell className="h-4 w-4" /></div>
              <div><p className="text-sm font-bold">Choose your alerts</p><p className="mt-0.5 text-xs text-neutral-500">Turn notifications on from your profile settings.</p></div>
            </div>
          </div>

          <div className="mt-6 grid gap-2.5">
            <button type="button" onClick={onClose} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0095F6] px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,149,246,.22)] hover:bg-[#1877F2]">Continue in light <ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={onThemeSettings} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"><Palette className="h-4 w-4" /> Open theme settings</button>
            <button type="button" onClick={onNotificationSettings} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 text-sm font-bold text-neutral-700 hover:bg-neutral-50"><Bell className="h-4 w-4" /> Open notification settings</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
