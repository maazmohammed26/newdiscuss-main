import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';

const groups = [
  { title: 'Product', links: [['Explore', '/feed'], ['Tech News', '/news'], ['Tech Jobs', '/jobs'], ['Download', '/download']] },
  { title: 'Company', links: [['About', '/about'], ['Blogs', '/blogs'], ['Careers', '/careers'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Guidelines', '/guidelines'], ['Terms', '/terms'], ['Privacy', '/privacy']] },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-4 py-10 text-neutral-950 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_2fr]">
        <div><DiscussLogo size="md" tagged /><p className="mt-4 max-w-xs text-sm leading-6 text-neutral-500">A focused social platform for developers to discuss ideas, share work, find people, and build together.</p></div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{groups.map((group) => <div key={group.title}><h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, path]) => <li key={label}><Link to={path} className="text-sm font-medium text-neutral-600 hover:text-neutral-950">{label}</Link></li>)}</ul></div>)}</div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-neutral-200 pt-5 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Discuss. All rights reserved.</span><span>Designed for developers, builders, and technical communities.</span></div>
    </footer>
  );
}
