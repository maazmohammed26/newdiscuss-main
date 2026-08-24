import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';

export default function SettingsInfoPageShell({ title, description, icon: Icon, children }) {
  const { user } = useAuth();
  const backTarget = user ? '/profile' : '/';
  const backLabel = user ? 'Back to profile' : 'Back to home';

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            to={backTarget}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-bold text-neutral-800 transition-colors hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5 stroke-[1.8px]" />
            <span>{backLabel}</span>
          </Link>
          <Link to={user ? '/feed' : '/'} aria-label="Discuss home">
            <DiscussLogo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-10 flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-100">
            <Icon className="h-5 w-5 stroke-[1.8px] text-neutral-950" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">{description}</p>
          </div>
        </div>

        <div className="border-y border-neutral-200">
          {children}
        </div>

        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-neutral-500" aria-label="Account information">
          <Link to="/terms" className="hover:text-neutral-950">Terms</Link>
          <Link to="/privacy" className="hover:text-neutral-950">Privacy</Link>
          <Link to="/support" className="hover:text-neutral-950">Support</Link>
          <span>© {new Date().getFullYear()} Discuss</span>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
