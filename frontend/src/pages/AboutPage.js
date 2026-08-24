import { useEffect } from 'react';
import { CheckCircle2, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';

const pillars = [
  { icon: MessageCircle, title: 'Useful conversation', text: 'Discussions are designed around context, thoughtful replies, and technical progress.' },
  { icon: Users, title: 'Real developer connection', text: 'Profiles, groups, chat, TalentGraph, and DevRadar help the right people find each other.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Discuss is ad-free and gives members clear control over visibility, alerts, and account security.' },
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'About | Discuss';
  }, []);

  return (
    <PublicPageShell
      eyebrow="About Discuss"
      title="A developer network built for signal, not noise."
      description="Discuss brings technical publishing, discovery, groups, and private conversation into one focused experience—without ads or engagement tricks."
    >
      <div className="grid overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, text }) => (
          <article key={title} className="bg-white p-6 sm:p-8">
            <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]"><Icon className="h-5 w-5" /></div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 grid gap-8 rounded-3xl bg-neutral-950 p-7 text-white sm:p-10 md:grid-cols-[1fr_.8fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-300">Independent product</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Designed and built in Bengaluru.</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-400">Discuss is an independently built platform created by Mohammed Maaz A to prove that a focused social product can feel calm, fast, and genuinely useful.</p>
        </div>
        <ul className="space-y-3 self-center text-sm text-neutral-300">
          {['Free to join', 'No targeted advertising', 'Built for developers and technical communities'].map(item => <li key={item} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-[#0095F6]" />{item}</li>)}
        </ul>
      </section>
    </PublicPageShell>
  );
}
