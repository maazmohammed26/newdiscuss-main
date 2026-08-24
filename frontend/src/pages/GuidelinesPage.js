import { useEffect } from 'react';
import { Flag, HeartHandshake, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';

const principles = [
  { icon: HeartHandshake, title: 'Build with respect', text: 'Challenge ideas without attacking people. Harassment, hate, intimidation, and impersonation are not welcome.' },
  { icon: MessageCircle, title: 'Keep contributions useful', text: 'Share relevant context, original work, and constructive feedback. Avoid spam, manipulation, and repetitive promotion.' },
  { icon: LockKeyhole, title: 'Protect people and credentials', text: 'Never expose private information, passwords, API keys, or content you do not have permission to publish.' },
  { icon: Flag, title: 'Report harmful content', text: 'Use reporting tools when something is unsafe or misleading. Do not escalate abuse publicly.' },
];

export default function GuidelinesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Community Guidelines | Discuss';
  }, []);

  return (
    <PublicPageShell eyebrow="Community guidelines" title="Make every discussion worth opening." description="These standards keep Discuss safe, focused, and useful for developers at every level." compact>
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
        {principles.map(({ icon: Icon, title, text }) => (
          <article key={title} className="flex gap-4 border-b border-neutral-200 p-5 last:border-b-0 sm:p-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]"><Icon className="h-5 w-5" /></div>
            <div><h2 className="text-[15px] font-bold">{title}</h2><p className="mt-1.5 text-sm leading-6 text-neutral-600">{text}</p></div>
          </article>
        ))}
      </div>
      <section className="mt-5 flex items-start gap-4 rounded-3xl bg-neutral-950 p-6 text-white">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
        <div><h2 className="text-sm font-bold">How enforcement works</h2><p className="mt-1.5 text-sm leading-6 text-neutral-400">Discuss may limit content or accounts that violate these standards. Serious or repeated abuse can result in permanent removal.</p></div>
      </section>
    </PublicPageShell>
  );
}
