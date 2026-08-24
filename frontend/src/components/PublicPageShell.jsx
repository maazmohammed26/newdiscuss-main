import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import DiscussLogo from '@/components/DiscussLogo';
import Footer from '@/components/Footer';

export default function PublicPageShell({ eyebrow, title, description, children, compact = false }) {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Discuss home"><DiscussLogo size="md" tagged /></Link>
          <nav className="flex items-center gap-1.5" aria-label="Public navigation">
            <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">Log in</Link>
            <Link to="/register" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800">Join Discuss</Link>
          </nav>
        </div>
      </header>

      <main className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${compact ? 'py-10 sm:py-14' : 'py-12 sm:py-20'}`}>
        <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" /> Back to Discuss
        </Link>

        <section className="relative overflow-hidden rounded-[30px] border border-neutral-200 bg-[#FAFAFA] px-5 py-9 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#0095F6]">{eyebrow}</p>
            <h1 className="mt-3 text-balance text-4xl font-black tracking-[-.045em] sm:text-5xl">{title}</h1>
            {description && <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-neutral-600 sm:text-base">{description}</p>}
          </div>
        </section>

        <div className="mt-8 sm:mt-10">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
