import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-md border-b border-white/10 relative select-none">
      {/* Top red-and-blue thick accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-center">
        <Link to="/" className="flex items-center" data-testid="header-logo">
          <DiscussLogo size="md" />
        </Link>
      </div>
    </header>
  );
}
