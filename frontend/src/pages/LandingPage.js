import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, CheckCircle2, Code2, ExternalLink, Loader2, Mail, MessageCircle, Radar, ShieldCheck, Users } from 'lucide-react';
import { FaApple } from 'react-icons/fa';
import { SiGoogleplay } from 'react-icons/si';
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
  { icon: BrainCircuit, label: 'AI-powered TalentGraph' },
  { icon: ShieldCheck, label: 'Private, ad-free experience' },
];

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=co.median.android.lpowadz';

function MobileAccessSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [showIosHelp, setShowIosHelp] = useState(false);

  const requestAndroidAccess = async (event) => {
    event.preventDefault();
    if (status === 'sending' || status === 'success') return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus('error');
      setMessage('Enter a valid Google Play email.');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch('/api/android-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, website: '' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not send your request.');

      setStatus('success');
      setMessage('Request sent. Check Google Play in 4–6 hours with this email.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Could not send your request. Please try again.');
    }
  };

  return (
    <section className="border-y border-neutral-200 bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-20" id="mobile-access">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#0095F6]">Discuss anywhere</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Take Discuss with you.</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600 sm:text-base">Android early access or an app-like iOS PWA.</p>
        </div>

        {/* Brand Icon Evolution Notice Card */}
        <div className="mt-10 rounded-[28px] border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-amber-50/60 p-5 sm:p-7 shadow-[0_12px_36px_rgba(15,23,42,.05)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Visual Icon Transition Flow */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Previous Logo */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm">
                  <img src="/logo-old.png" alt="Previous Discuss App Icon" className="h-full w-full object-contain rounded-xl" />
                </div>
                <span className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400">Previous Icon</span>
              </div>

              {/* Hand-drawn SVG Arrow */}
              <div className="flex flex-col items-center justify-center px-1 sm:px-2">
                <svg width="68" height="32" viewBox="0 0 68 32" fill="none" className="overflow-visible">
                  <path
                    d="M4 16 C 22 5, 42 5, 58 16 M48 8 L60 16 L50 24"
                    stroke="#0095F6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lp-arrow-sketch"
                  />
                </svg>
                <span className="lp-handwritten text-[#0095F6] text-xs sm:text-sm font-bold -mt-0.5">Updated</span>
              </div>

              {/* New 3D Robot Logo */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 border-[#0095F6]/40 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,149,246,0.22)]">
                  <img src="/logo-new.png" alt="New Discuss 2.0 App Icon" className="h-full w-full object-contain rounded-xl" />
                  <span className="absolute -top-2 -right-2 rounded-full bg-[#0095F6] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-xs">NEW</span>
                </div>
                <span className="mt-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#0095F6]">Discuss 2.0</span>
              </div>
            </div>

            {/* Handwritten Professional Notification Message */}
            <div className="flex-1 lg:border-l lg:border-neutral-200 lg:pl-6 border-t border-neutral-200/80 pt-4 lg:pt-0">
              <div className="inline-flex items-center rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0072C6]">
                BRAND REFRESH
              </div>
              <p className="lp-handwritten mt-2 text-neutral-800 text-base sm:text-lg lg:text-xl font-medium leading-snug">
                “This is our new official app logo. The iOS & Android PWA has been updated with the new design, while the Google Play Store build currently shows our previous logo as the update rolls out.”
              </p>
              <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                Play Store build will reflect the new 3D logo soon. Standalone PWA is live with the new icon & flash screen.
              </p>
            </div>

          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <article className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.07)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#34A853] via-[#FBBC04] to-[#4285F4]" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-lg">
                <SiGoogleplay className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Early access</span>
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight">Discuss for Android</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">Use your Google Play email. Access is usually added within 4–6 hours.</p>

            <form onSubmit={requestAndroidAccess} className="mt-6" noValidate>
              <label htmlFor="android-access-email" className="text-xs font-bold uppercase tracking-[.12em] text-neutral-500">Google Play email</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                  <input
                    id="android-access-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); if (status === 'error') setStatus('idle'); }}
                    placeholder="you@gmail.com"
                    disabled={status === 'sending' || status === 'success'}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] pl-10 pr-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-[#0095F6] focus:ring-4 focus:ring-[#0095F6]/10 disabled:opacity-70"
                    aria-describedby="android-access-status"
                    required
                  />
                  <input name="website" tabIndex="-1" autoComplete="off" className="absolute -left-[9999px]" aria-hidden="true" />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending' || status === 'success'}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending</> : status === 'success' ? <><CheckCircle2 className="h-4 w-4" /> Requested</> : 'Request access'}
                </button>
              </div>
              <div id="android-access-status" aria-live="polite" className={`mt-3 min-h-5 text-xs font-medium ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {message || 'We only send this request to the Discuss Admin bot. It is not saved in our database.'}
              </div>
            </form>

            <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#0095F6] hover:text-[#1877F2]">
              Open Google Play <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>

          <article className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,.07)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-neutral-950 via-neutral-500 to-neutral-200" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-lg">
                <FaApple className="h-7 w-7" aria-hidden="true" />
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">PWA</span>
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight">Discuss for iOS</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Install from Safari for a fast, full-screen app experience.</p>
            <button type="button" onClick={() => setShowIosHelp((current) => !current)} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-bold text-neutral-950 shadow-sm transition hover:bg-neutral-50">
              {showIosHelp ? 'Hide instructions' : 'Install iOS PWA'}
            </button>
            {showIosHelp && (
              <div className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                In Safari, tap <span className="font-bold text-neutral-950">Share</span>, then <span className="font-bold text-neutral-950">Add to Home Screen</span>.
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

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

  // Guests see the public landing page immediately while Firebase resolves in
  // the background. Cached signed-in users already hydrate synchronously and
  // continue to the feed without flashing this page.
  if (user) return <LoadingScreen message="Opening Discuss…" compact />;

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
                <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-black tracking-wide text-white">DISCUSS 2.0</span>
                A smarter network for people who build
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

        <MobileAccessSection />

        <section className="px-4 pb-16 sm:px-6 sm:pb-20"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-[28px] bg-neutral-950 px-6 py-10 text-center text-white sm:px-10 md:flex-row md:text-left"><div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your next useful conversation starts here.</h2><p className="mt-2 text-sm text-neutral-400">Join developers sharing what they know and building what comes next.</p></div><Link to="/register" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-neutral-950 hover:bg-neutral-100">Start discussing <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>

      <Footer isLandingPage />
    </div>
  );
}
