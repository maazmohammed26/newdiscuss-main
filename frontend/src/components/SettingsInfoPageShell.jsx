import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import { useAuth } from '@/contexts/AuthContext';
import Footer from '@/components/Footer';

export default function SettingsInfoPageShell({ title, description, icon: Icon, children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const backTarget = user ? '/settings' : '/';
  const backLabel = user ? 'Back to settings' : 'Back to home';

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-950 dark:text-white pb-32">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 dark:border-[#262626] bg-white/90 dark:bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => user ? navigate(-1) : navigate('/')}
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-bold text-neutral-800 dark:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 stroke-[1.8px]" />
            <span>{backLabel}</span>
          </button>
          <Link to={user ? '/feed' : '/'} aria-label="Discuss home">
            <DiscussLogo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
            <Icon className="h-5 w-5 stroke-[1.8px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[-0.03em] sm:text-3xl text-neutral-950 dark:text-white">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">{description}</p>
          </div>
        </div>

        <div className="border-y border-neutral-200 dark:border-[#262626]">
          {children}
        </div>

        <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400" aria-label="Account information">
          <Link to="/terms" className="hover:text-neutral-950 dark:hover:text-white">Terms</Link>
          <Link to="/privacy" className="hover:text-neutral-950 dark:hover:text-white">Privacy</Link>
          <Link to="/support" className="hover:text-neutral-950 dark:hover:text-white">Support</Link>
          <Link to="/guidelines" className="hover:text-neutral-950 dark:hover:text-white">Guidelines</Link>
          <span>© {new Date().getFullYear()} Discuss</span>
        </nav>
      </main>

      {/* Only render public marketing footer for unauthenticated users */}
      {!user && <Footer />}
    </div>
  );
}

