import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { ArrowLeft, ShieldCheck, HeartHandshake, MessageCircle, LockKeyhole, Sparkles, Flag, Home } from 'lucide-react';

const principles = [
  { icon: HeartHandshake, title: 'Build with respect', text: 'Treat every developer as a collaborator. Debate ideas without attacking people.' },
  { icon: Sparkles, title: 'Share authentic work', text: 'Post original discussions, code, projects, and useful context. Credit sources clearly.' },
  { icon: MessageCircle, title: 'Keep feedback constructive', text: 'Explain what can improve and why. Avoid harassment, spam, or repetitive promotion.' },
  { icon: LockKeyhole, title: 'Protect privacy', text: 'Never publish private credentials, personal data, or content you do not have permission to share.' },
  { icon: Flag, title: 'Help keep Discuss safe', text: 'Report harmful or misleading content so the community can stay focused and welcoming.' },
];

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-white pb-28 dark:bg-black">
      <Header />
      <main className="mx-auto w-full max-w-[680px] px-4 py-5">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/feed" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Back to home"><ArrowLeft className="h-5 w-5" /></Link>
          <div><h1 className="text-xl font-bold text-neutral-900 dark:text-white">Community Guidelines</h1><p className="text-[12px] text-neutral-500">A focused space for people who build</p></div>
        </div>

        <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#0095F6] to-[#5851DB] p-6 text-white shadow-[0_16px_40px_rgba(0,149,246,0.18)]">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"><ShieldCheck className="h-6 w-6" /></div>
          <h2 className="text-2xl font-bold">Make Discuss valuable.</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-white/85">Every post should help someone learn, collaborate, solve a problem, or discover meaningful work.</p>
        </section>

        <div className="overflow-hidden rounded-2xl border border-[#EFEFEF] dark:border-[#262626]">
          {principles.map(({ icon: Icon, title, text }) => (
            <article key={title} className="flex gap-4 border-b border-[#EFEFEF] p-4 last:border-0 dark:border-[#262626]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0095F6]/10 text-[#0095F6]"><Icon className="h-5 w-5" /></div>
              <div><h3 className="text-[14px] font-bold text-neutral-900 dark:text-white">{title}</h3><p className="mt-1 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">{text}</p></div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#FAFAFA] p-5 text-center dark:bg-[#121212]"><p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">Discuss may remove content or restrict accounts that repeatedly violate these guidelines.</p><Link to="/feed" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-[13px] font-bold text-white dark:bg-white dark:text-black"><Home className="h-4 w-4" /> Back to home</Link></div>
      </main>
    </div>
  );
}
