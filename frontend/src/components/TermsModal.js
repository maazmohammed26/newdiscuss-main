import { CheckCircle2, FileText, ShieldCheck, Users, X } from 'lucide-react';
import DiscussLogo from '@/components/DiscussLogo';

const sections = [
  { icon: Users, title: 'Respect the community', text: 'Use Discuss for constructive technical exchange. Harassment, impersonation, spam, and abusive behavior are not allowed.' },
  { icon: FileText, title: 'Share responsibly', text: 'Only publish content and media you are permitted to share. You remain responsible for your posts, projects, messages, and links.' },
  { icon: ShieldCheck, title: 'Protect accounts and privacy', text: 'Keep your credentials secure, avoid publishing sensitive information, and report suspicious or unsafe activity promptly.' },
];

export default function TermsModal({ open, onClose, onAccept, showAcceptButton = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <section className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] border border-white/10 bg-[#101010] text-white shadow-2xl sm:rounded-[26px]" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="terms-title">
        <header className="flex items-start justify-between border-b border-white/10 px-5 py-5 sm:px-6">
          <div><DiscussLogo size="sm" tagged dark /><h2 id="terms-title" className="mt-3 text-xl font-bold tracking-tight">Terms and Conditions</h2><p className="mt-1 text-xs text-neutral-500">A short summary of the standards that keep Discuss useful.</p></div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close terms"><X className="h-4 w-4" /></button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm leading-6 text-neutral-300">By creating or using an account, you agree to follow these terms, the Community Guidelines, and applicable laws. The complete legal pages remain available from the footer.</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            {sections.map(({ icon: Icon, title, text }) => <article key={title} className="flex gap-3 border-b border-white/10 p-4 last:border-0"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0095F6]/10 text-[#0095F6]"><Icon className="h-4 w-4" /></div><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-neutral-400">{text}</p></div></article>)}
          </div>
          <div className="mt-5 flex gap-3 rounded-2xl bg-white/[.04] p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><p className="text-xs leading-5 text-neutral-400">You may stop using Discuss or delete your account through available account controls. Discuss may restrict accounts or content that violate these standards.</p></div>
          <p className="mt-5 text-[11px] text-neutral-600">Last updated: August 2026</p>
        </div>

        <footer className="border-t border-white/10 bg-[#101010]/95 p-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => showAcceptButton ? onAccept?.() : onClose()} className={`h-11 w-full rounded-xl text-sm font-bold transition-all active:scale-[.99] ${showAcceptButton ? 'bg-[#0095F6] text-white hover:bg-[#1877F2]' : 'bg-white text-neutral-950 hover:bg-neutral-100'}`}>{showAcceptButton ? 'Accept and continue' : 'Close'}</button>
        </footer>
      </section>
    </div>
  );
}
