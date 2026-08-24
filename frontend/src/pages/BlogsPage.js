import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';

const posts = [
  {
    title: 'Building a focused developer ecosystem',
    category: 'Product architecture',
    readTime: '5 min read',
    summary: 'How Discuss combines publishing, discovery, profiles, groups, and conversation without turning the product into a noisy engagement feed.',
    body: ['Discuss started with one product rule: every feature should help a developer learn, share, discover, or collaborate.', 'React keeps the interface responsive while Firebase powers the real-time product services. The UI keeps previously loaded content visible as updates arrive in the background, reducing disruptive reload states.'],
  },
  {
    title: 'Designing calmer real-time chat',
    category: 'Engineering',
    readTime: '7 min read',
    summary: 'A practical look at cache-first rendering, background synchronization, and stable conversation layouts.',
    body: ['Real-time does not need to mean visually unstable. Discuss keeps conversation structure mounted while new snapshots update the data behind it.', 'The result is a calmer experience: familiar content appears immediately, new messages arrive in place, and navigation does not rebuild the entire screen.'],
  },
  {
    title: 'One experience across web, PWA, and Android',
    category: 'Platform',
    readTime: '4 min read',
    summary: 'Why a responsive web foundation makes Discuss easier to improve consistently across devices.',
    body: ['A shared interface makes product improvements available across browser, installed PWA, and wrapped Android experiences.', 'Careful startup styling, responsive layouts, and route-level loading keep the product feeling intentional on small and large screens.'],
  },
];

export default function BlogsPage() {
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Engineering Blog | Discuss';
  }, []);

  return (
    <PublicPageShell eyebrow="Engineering blog" title="Notes from building Discuss." description="Short, practical writing about product decisions, interface quality, and the systems behind a modern developer network.">
      <div className="space-y-4">
        {posts.map((post, index) => {
          const isOpen = expanded === index;
          return (
            <article key={post.title} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,.05)]">
              <button type="button" onClick={() => setExpanded(isOpen ? null : index)} className="flex w-full items-start justify-between gap-5 p-6 text-left sm:p-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em]"><span className="text-[#0095F6]">{post.category}</span><span className="text-neutral-300">/</span><span className="text-neutral-400">{post.readTime}</span></div>
                  <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{post.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{post.summary}</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600"><ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
              </button>
              {isOpen && <div className="space-y-4 border-t border-neutral-200 bg-[#FAFAFA] px-6 py-6 text-sm leading-7 text-neutral-600 sm:px-8">{post.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>}
            </article>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
