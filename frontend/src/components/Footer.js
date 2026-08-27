import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';

const groups = [
  { title: 'Product', links: [['Explore', '/feed'], ['Tech News', '/news'], ['Tech Jobs', '/jobs']] },
  { title: 'Company', links: [['About', '/about'], ['Blogs', '/blogs'], ['Careers', '/careers'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Guidelines', '/guidelines'], ['Terms', '/terms'], ['Privacy', '/privacy'], ['Support', '/support']] },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-[#FAFAFA] px-4 py-12 text-neutral-950 sm:px-6 sm:py-14">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="relative h-11 w-11 shrink-0 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm transition hover:scale-105">
              <img src="/logo-new.png" alt="Discuss 2.0 Icon" className="h-full w-full object-contain rounded-xl" />
            </div>
            <DiscussLogo size="md" tagged />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-neutral-500">A focused, ad-free network where developers exchange ideas, share work, and build useful connections.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[11px] font-bold text-neutral-600 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#0095F6] animate-pulse" />
            Discuss 2.0 · Built for people who build
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">{groups.map((group) => <div key={group.title}><h2 className="text-[11px] font-extrabold uppercase tracking-[.16em] text-neutral-400">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, path]) => <li key={label}><Link to={path} className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0095F6]">{label}</Link></li>)}</ul></div>)}</div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Discuss. All rights reserved.</span><span>Designed in Bengaluru for developers everywhere.</span></div>
    </footer>
  );
}
