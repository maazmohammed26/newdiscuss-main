import { useEffect } from 'react';
import { BriefcaseBusiness, Mail } from 'lucide-react';
import PublicPageShell from '@/components/PublicPageShell';

export default function CareersPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers | Discuss';
  }, []);

  return (
    <PublicPageShell eyebrow="Careers" title="Small team. Serious ambition." description="Discuss is currently independently built and managed. New roles will be published here when the team expands." compact>
      <section className="mx-auto max-w-2xl rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,.07)] sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0095F6]"><BriefcaseBusiness className="h-5 w-5" /></div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">No open roles today</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-600">There is no active recruitment drive. Future engineering, community, design, and operations opportunities will appear on this page with clear role details.</p>
        <a href="mailto:support@discussit.in?subject=Careers%20at%20Discuss" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white hover:bg-neutral-800"><Mail className="h-4 w-4" /> Contact Discuss</a>
      </section>
    </PublicPageShell>
  );
}
