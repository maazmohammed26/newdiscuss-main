import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import DiscussLogo from '@/components/DiscussLogo';
import Footer from '@/components/Footer';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import AdminMessageBanner from '@/components/AdminMessageBanner';
import { Loader2, Zap, ArrowRight, Lock, Code, Search, Globe, UserCheck,
  MessageSquare, FolderGit2, Shield, Clock, Users, Briefcase, MessageCircle,
  Check } from 'lucide-react';
import './LandingPage.css';

const FEATURES = [
  { icon: MessageSquare, title: 'Thoughtful Discussions', desc: 'A space for meaningful conversations. Share ideas, get feedback, and engage with a community that values depth over noise.' },
  { icon: FolderGit2, title: 'Project Showcase', desc: 'Share your work with GitHub links and live previews. Get real feedback from developers who understand your craft.' },
  { icon: Lock, title: 'Private & Secure Chats', desc: 'End-to-end encrypted personal messaging. Chat only with approved friends. No ads, no tracking.', isNew: true },
  { icon: Zap, title: 'Real-time Everything', desc: 'Votes, comments, posts, and messages update instantly. Stay connected without hitting refresh.' },
  { icon: Code, title: 'Developer Profiles', desc: 'Showcase your skills, projects, and contributions. Let your work speak for itself.' },
  { icon: UserCheck, title: 'Recruiter Discovery', desc: 'Companies can explore talent through skills and projects. Privacy-first approach — you control who connects.' },
];

const PILLS = [
  { icon: Shield, label: 'No Noise' },
  { icon: Clock, label: 'Auto-Delete Chats' },
  { icon: Search, label: 'Smart Discovery' },
  { icon: Globe, label: 'Open Community' },
];

const SIGNAL_CHECKLIST = [
  'Text stories up to 350 characters',
  'Auto-detects & previews any URL you share',
  'Seen by everyone on the platform',
  'Auto-deletes after 24 hours — zero cleanup needed',
  'Real-time view counts visible only to you',
];

const AUDIENCE = [
  { icon: Code, color: '#2563EB', title: 'Developers', sub: 'Share projects and ideas' },
  { icon: Users, color: '#10B981', title: 'Students', sub: 'Learn and explore' },
  { icon: Briefcase, color: '#F59E0B', title: 'Recruiters', sub: 'Discover talent' },
  { icon: MessageCircle, color: '#8B5CF6', title: 'Learners', sub: 'Engage in discussions' },
];

const THEME_DOTS = [
  { id: 'light', label: 'White', bg: '#FFFFFF', border: '#D1D5DB' },
  { id: 'dark', label: 'Charcoal', bg: '#374151', border: 'transparent' },
  { id: 'discuss-light', label: 'Blue', bg: '#2563EB', border: 'transparent' },
  { id: 'discuss-black', label: 'Black', bg: '#0D0D12', border: '#6B7280' },
];

const SIGNAL_H2 = 'Share your thoughts, gone in 24 hours.';

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme, changeTheme } = useTheme();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const typewriterRef  = useRef(null);
  const checklistRef   = useRef(null);
  const signalCardRef  = useRef(null);
  const signalCardDone = useRef(false);

  useEffect(() => {
    if (!authLoading && user) navigate('/feed', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseFloat(el.dataset.delay || 0);
            setTimeout(() => el.classList.add('lp-animated'), delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-animate]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const el = typewriterRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = SIGNAL_H2;
      return;
    }
    el.textContent = '';
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      let i = 0;
      el.classList.add('lp-typewriter-cursor');
      const iv = setInterval(() => {
        el.textContent = SIGNAL_H2.slice(0, ++i);
        if (i >= SIGNAL_H2.length) {
          clearInterval(iv);
          setTimeout(() => el.classList.remove('lp-typewriter-cursor'), 2200);
        }
      }, 32);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const container = checklistRef.current;
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll('.lp-check-item').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      container.querySelectorAll('.lp-check-item').forEach((el, i) => {
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, i * 180);
      });
    }, { threshold: 0.2 });
    obs.observe(container);
    return () => obs.disconnect();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const el = signalCardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || signalCardDone.current) return;
      signalCardDone.current = true;
      obs.disconnect();
      setTimeout(() => el.classList.add('lp-signal-card-enter'), 400);
    }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] mx-auto mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Redirecting to feed...</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadingScreen message="Preparing your experience..." />;

  return (
    <div className="lp-page min-h-screen bg-background text-foreground">

      <nav className="lp-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" aria-label="Discuss home">
            <DiscussLogo size="md" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              {THEME_DOTS.map((dot) => (
                <div key={dot.id} className="lp-theme-dot-wrap">
                  <button
                    className={`lp-theme-dot${theme === dot.id ? ' lp-dot-active' : ''}`}
                    style={{ background: dot.bg, border: `2px solid ${dot.border}` }}
                    onClick={() => changeTheme(dot.id)}
                    aria-label={`Switch to ${dot.label} theme`}
                  />
                  <span className="lp-tooltip lp-mono">{dot.label}</span>
                </div>
              ))}
            </div>
            <Link to="/register">
              <button
                className="lp-mono text-white rounded-[6px] px-3 sm:px-5 py-2 text-[12px] sm:text-[13px] font-semibold transition-all hover:opacity-90 active:scale-95 whitespace-nowrap"
                style={{ background: 'hsl(var(--primary))' }}
              >
                <span className="hidden sm:inline">Get </span>Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <AdminMessageBanner />
      <PWAInstallBanner />
      <PWAInstallPrompt />

      <section className="pt-20 pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center">
          <div className="lp-hero-eyebrow mb-5">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold lp-mono"
              style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(236,72,153,0.08))', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}
            >
              <Zap style={{ width: 10, height: 10, fill: '#a855f7', color: '#a855f7' }} />
              Introducing Signal · ephemeral stories for developers
            </span>
          </div>

          <div className="lp-hero-tag mb-6">
            <span
              className="inline-flex items-center gap-0 text-xs font-semibold px-4 py-2 rounded-[6px] bg-card border border-border lp-mono"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <span style={{ color: '#EF4444' }}>&lt;</span>
              <span className="text-foreground">&nbsp;A Developer-First Platform&nbsp;</span>
              <span style={{ color: '#EF4444' }}>&gt;</span>
            </span>
          </div>

          <h1 data-testid="hero-title"
            className="text-[clamp(2rem,6vw,4.5rem)] font-bold leading-[1.12] text-foreground mb-6"
          >
            <span className="lp-hero-h1-line1">Where deep thought meets</span>
            <span className="lp-hero-h1-line2">
              {' '}
              <em className="not-italic" style={{ color: 'hsl(var(--primary))', fontStyle: 'italic' }}>beautiful</em>
              {' '}design.
            </span>
          </h1>

          <p className="lp-hero-body lp-body-text text-muted-foreground text-[15px] sm:text-[17px] leading-relaxed max-w-xl mx-auto mb-8">
            Discuss is a curated editorial platform for developers to share ideas, projects, and meaningful conversations — without noise, ads, or distractions.
          </p>

          <div className="lp-hero-ctas flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto mb-8">
            <Link to="/register" className="flex-1">
              <button
                data-testid="hero-register-btn"
                data-primary="true"
                className="w-full text-white font-semibold rounded-[6px] px-8 py-3 text-[15px] transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'hsl(var(--primary))', boxShadow: '0 2px 12px hsl(var(--primary) / 0.35)' }}
              >
                Get Started <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </Link>
            <Link to="/login" className="flex-1">
              <button
                data-testid="hero-login-btn"
                className="w-full font-medium rounded-[6px] px-8 py-3 text-[15px] border border-border bg-card text-foreground transition-all hover:opacity-80 active:scale-95"
              >
                Explore Feed
              </button>
            </Link>
          </div>

          <p className="lp-hero-bottom lp-mono text-muted-foreground text-[11px] tracking-widest uppercase">
            Built for developers. Designed for focus.
          </p>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 bg-card border-y border-border">
        <div className="max-w-3xl mx-auto text-center" data-animate="up">
          <p className="lp-body-text text-muted-foreground text-[15px] sm:text-[17px] leading-relaxed">
            Discuss provides a clean, focused space for real conversations and feedback. Share projects, connect with peers, engage in thoughtful discussions, and discover talent — all in a platform centered around developers and learning.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14" data-animate="up">
            <h2 className="text-[2rem] sm:text-[2.5rem] font-bold text-foreground mb-3">Everything you need</h2>
            <p className="lp-body-text text-muted-foreground text-[15px]">A complete platform for developers to share, connect, and grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                data-testid={`feature-card-${i}`}
                data-animate={i % 2 === 0 ? 'left' : 'right'}
                data-delay={i * 150}
                className={`lp-feature-card bg-card border border-border rounded-[12px] p-5 shadow-card ${f.isNew ? 'ring-2 ring-[#10B981]/40 ring-offset-2 ring-offset-background' : ''}`}
              >
                <div className="lp-film-perfs" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, j) => <span key={j} className="lp-film-perf" />)}
                </div>
                {f.isNew && (
                  <span className="lp-new-badge absolute -top-2.5 left-8 bg-[#10B981] text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide lp-mono">New</span>
                )}
                <div className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-4 bg-muted">
                  <f.icon className="w-5 h-5" style={{ color: f.isNew ? '#10B981' : 'hsl(var(--primary))' }} />
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: f.isNew ? '#10B981' : 'hsl(var(--foreground))' }}>{f.title}</h3>
                <p className="lp-body-text text-muted-foreground text-[13px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-4 sm:px-6 bg-muted/40 border-y border-border overflow-hidden">
        <div className="max-w-5xl mx-auto" data-animate="fade">
          <div className="lp-pills-row">
            {PILLS.map((p, i) => (
              <span key={i} className="lp-mono inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-foreground text-[12px] font-semibold whitespace-nowrap flex-shrink-0">
                <p.icon className="w-3.5 h-3.5" style={{ color: 'hsl(var(--primary))' }} />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="signal-section" className="py-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[22px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 55%,#0a1628 100%)', border: '1px solid rgba(168,85,247,0.22)', boxShadow: '0 24px 60px rgba(168,85,247,0.12)' }}>
            <div style={{ position:'absolute',top:'-70px',right:'-70px',width:'280px',height:'280px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,0.18) 0%,transparent 70%)',pointerEvents:'none' }} />
            <div style={{ position:'absolute',bottom:'-50px',left:'-50px',width:'220px',height:'220px',borderRadius:'50%',background:'radial-gradient(circle,rgba(236,72,153,0.14) 0%,transparent 70%)',pointerEvents:'none' }} />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-8 sm:p-12 flex flex-col justify-center" data-animate="left">
                <div className="lp-mono inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-5" style={{ background:'rgba(168,85,247,0.18)', border:'1px solid rgba(168,85,247,0.35)', color:'#c084fc' }}>
                  <Zap className="w-3 h-3 fill-current" />
                  NEW · SIGNAL
                </div>
                <h2 ref={typewriterRef} className="text-[1.8rem] sm:text-[2.2rem] font-bold leading-tight mb-4" style={{ color: '#f5f3ff', minHeight: '3.5em' }} aria-label={SIGNAL_H2} />
                <ul ref={checklistRef} className="space-y-3 mb-8">
                  {SIGNAL_CHECKLIST.map((item, i) => (
                    <li key={i} className="lp-check-item flex items-start gap-2.5 text-[13px]" style={{ color:'rgba(245,243,255,0.78)' }}>
                      <span className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background:'linear-gradient(135deg,#a855f7,#ec4899)', color:'#fff' }}>
                        <Check style={{ width:8, height:8, strokeWidth:3 }} />
                      </span>
                      {item.includes('24 hours') ? (
                        <span>Auto-deletes after <span className="lp-pulse-text font-semibold text-purple-300">24 hours</span> — zero cleanup needed</span>
                      ) : item}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ background:'linear-gradient(135deg,#a855f7,#ec4899)', boxShadow:'0 8px 24px rgba(168,85,247,0.35)' }}>
                    <Zap className="w-4 h-4 fill-white" />
                    Try Signal Now
                  </button>
                </Link>
              </div>
              <div className="p-6 sm:p-10 flex items-center justify-center" data-animate="right">
                <div ref={signalCardRef} className="w-full max-w-[260px]" style={{ opacity:0 }}>
                  <div className="rounded-[18px] overflow-hidden" style={{ background:'linear-gradient(160deg,#1a1030 0%,#0f1825 100%)', border:'1px solid rgba(168,85,247,0.2)', boxShadow:'0 16px 40px rgba(0,0,0,0.4)', aspectRatio:'9/16', position:'relative' }}>
                    <div className="absolute top-3 left-3 right-3 flex gap-1">
                      {[100,40].map((w,j) => (
                        <div key={j} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.18)' }}>
                          <div className="h-full rounded-full" style={{ width:`${w}%`, background:'linear-gradient(90deg,#a855f7,#ec4899)' }} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute" style={{ top:24, left:12, right:12 }}>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background:'linear-gradient(135deg,#a855f7,#ec4899)' }} />
                        <div>
                          <div className="lp-mono text-white text-[11px] font-semibold">your_username</div>
                          <div className="text-white/50 text-[9px]">2m · Signal</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute px-4" style={{ top:'50%',transform:'translateY(-50%)',left:0,right:0 }}>
                      <p className="text-white text-[13px] font-medium leading-relaxed">
                        Tried Signal yet? ⚡<br /><br />Share a thought with the community.<br /><br />
                        {"It's "}<span className="lp-pulse-text">gone in 24h</span>{". 🕐"}
                      </p>
                      <div className="mt-3 rounded-[8px] overflow-hidden" style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(168,85,247,0.25)' }}>
                        <div className="flex">
                          <div className="w-12 h-12 flex-shrink-0" style={{ background:'linear-gradient(135deg,#7c3aed,#db2777)' }} />
                          <div className="p-2 min-w-0">
                            <div className="lp-mono text-[9px] font-bold uppercase tracking-wider" style={{ color:'#c084fc' }}>discuss.io</div>
                            <div className="text-white text-[10px] font-semibold mt-0.5 truncate">Discuss Developer Platform</div>
                            <div className="text-white/40 text-[9px] truncate">A space for developers to connect</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background:'rgba(168,85,247,0.2)', border:'1px solid rgba(168,85,247,0.3)' }}>
                        <Zap className="w-2.5 h-2.5 text-purple-300 fill-purple-300" />
                        <span className="lp-mono text-purple-300 text-[9px] font-bold uppercase tracking-wider">Signal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12" data-animate="up">
            <DiscussLogo size="lg" />
            <p className="lp-mono text-muted-foreground text-[12px] uppercase tracking-widest mt-2 mb-4">Discuss Developer Platform</p>
            <h2 className="text-[1.9rem] sm:text-[2.3rem] font-bold text-foreground mb-2">A space for developers to connect</h2>
            <p className="lp-mono text-muted-foreground text-[12px] uppercase tracking-widest">SIGNAL · Built for everyone who builds</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCE.map((a, i) => (
              <div key={i} className="lp-tile-wrap" data-animate="flip" data-delay={i * 120}>
                <div className="bg-card border border-border rounded-[14px] p-6 text-center hover:border-[hsl(var(--primary)_/_0.4)] transition-colors shadow-card">
                  <div className="w-12 h-12 rounded-[10px] flex items-center justify-center mx-auto mb-4" style={{ background: `${a.color}1A` }}>
                    <a.icon className="w-6 h-6" style={{ color: a.color }} />
                  </div>
                  <h4 className="font-semibold text-foreground text-[14px] mb-1">{a.title}</h4>
                  <p className="lp-body-text text-muted-foreground text-[12px]">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
        <div className="lp-cta-bg absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, hsl(var(--primary) / 0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, hsl(var(--primary) / 0.08) 0%, transparent 60%)' }} aria-hidden="true" />
        <div className="relative z-10 max-w-xl mx-auto text-center" data-animate="up">
          <h2 className="text-[2rem] sm:text-[2.6rem] font-bold text-foreground mb-4">Ready to join the conversation?</h2>
          <p className="lp-body-text text-muted-foreground text-[15px] sm:text-[17px] mb-8">Join a community of developers sharing knowledge, projects, and ideas.</p>
          <Link to="/register">
            <button
              data-testid="cta-register-btn"
              data-primary="true"
              className="lp-cta-btn-glow text-white font-semibold rounded-[8px] px-10 py-4 text-[15px] transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'hsl(var(--primary))' }}
            >
              Create Free Account <ArrowRight className="inline w-4 h-4 ml-2" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
