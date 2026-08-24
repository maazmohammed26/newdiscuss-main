import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, MessageCircle, Radar, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DiscussLogo from '@/components/DiscussLogo';
import LoadingScreen from '@/components/LoadingScreen';
import Footer from '@/components/Footer';
import './LandingPage.css';

const features = [
  { icon: MessageCircle, title: 'Focused discussions', text: 'Ask technical questions, exchange useful feedback, and keep every conversation relevant.' },
  { icon: Code2, title: 'Projects that get seen', text: 'Share builds, code, GitHub links, previews, images, and progress with other developers.' },
  { icon: Users, title: 'People, groups, and chat', text: 'Find collaborators, join developer groups, and move naturally into private conversations.' },
];

const signals = [
  { icon: Radar, label: 'Discover nearby developers' },
  { icon: Sparkles, label: 'AI-powered TalentGraph' },
  { icon: ShieldCheck, label: 'Private, ad-free experience' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/feed', { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    document.title = 'Discuss — Developer discussions, projects, groups, and chat';
    const description = 'Discuss is a focused social platform for developers to share technical discussions and projects, discover peers, join groups, and chat without ads or noise.';
    const setMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    };
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="keywords"]', { name: 'keywords', content: 'developer community, programming discussions, coding projects, developer chat, tech groups, find developers, Discuss app' });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: 'Discuss — Built for developers' });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  }, []);

  if (loading || user) return <LoadingScreen message="Opening Discuss…" />;

  return (
    <div className="lp-page min-h-screen bg-white text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Discuss home"><DiscussLogo size="md" tagged /></Link>
          <nav className="flex items-center gap-2" aria-label="Primary navigation">
            <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">Log in</Link>
            <Link to="/register" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Join Discuss</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-neutral-200">
          <div className="lp-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0095F6]" /> A focused network for people who build
              </div>
              <h1 className="text-balance text-5xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl lg:text-7xl">
                Ideas become better when developers <span className="lp-gradient-text">discuss.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-neutral-600 sm:text-lg">
                Share technical ideas and projects, find the right people, join groups, and chat—inside one clean, ad-free developer community.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0095F6] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,149,246,.22)] hover:bg-[#1877F2]">
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/feed" className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-sm font-bold text-neutral-900 hover:bg-neutral-50">Explore discussions</Link>
              </div>
              <p className="mt-4 text-xs text-neutral-500">Free to join · No ads · Built for meaningful technical exchange</p>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-8 rounded-full bg-gradient-to-br from-red-500/10 to-blue-500/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-3 shadow-[0_30px_80px_rgba(15,23,42,.12)]">
                <div className="rounded-[22px] bg-neutral-950 p-5 text-white">
                  <div className="mb-8 flex items-center justify-between"><DiscussLogo size="sm" tagged dark /><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold">LIVE</span></div>
                  <p className="text-xs font-semibold text-blue-300">#build-in-public</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">How would you architect offline-first group chat?</h2>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">Compare sync strategies, share code, and turn an idea into a useful technical thread.</p>
                  <div className="mt-7 flex items-center gap-3 border-t border-white/10 pt-4"><div className="flex -space-x-2"><span className="h-8 w-8 rounded-full border-2 border-neutral-950 bg-red-400" /><span className="h-8 w-8 rounded-full border-2 border-neutral-950 bg-blue-400" /><span className="h-8 w-8 rounded-full border-2 border-neutral-950 bg-emerald-400" /></div><span className="text-xs text-neutral-400">Developers are discussing now</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#0095F6]">Everything connected</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Less noise. More useful interaction.</h2><p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">Discuss keeps discovery, publishing, collaboration, and communication in one focused experience.</p></div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="bg-white p-7 sm:p-8"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0095F6]"><Icon className="h-5 w-5" /></div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p></article>)}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">{signals.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-4 text-sm font-semibold text-neutral-700"><Icon className="h-5 w-5 text-[#0095F6]" />{label}</div>)}</div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-[28px] bg-neutral-950 px-6 py-10 text-center text-white sm:px-10 md:flex-row md:text-left"><div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your next useful conversation starts here.</h2><p className="mt-2 text-sm text-neutral-400">Join developers sharing what they know and building what comes next.</p></div><Link to="/register" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-neutral-950 hover:bg-neutral-100">Start discussing <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>

      <Footer />
    </div>
  );
}
