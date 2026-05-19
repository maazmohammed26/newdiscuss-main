import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, Loader2, Share, PlusSquare, X, Smartphone, Download } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import './LandingPage.css';

// ── Animation Components ─────────────────────────────────────
const DEV_QUOTES = [
  '"Talk is cheap. Show me the code." – Linus Torvalds',
  '"Programs must be written for people to read, and only secondarily for machines to execute." – Harold Abelson',
  '"Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live." – John Woods',
  '"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." – Martin Fowler',
  '"Truth can only be found in one place: the code." – Robert C. Martin',
  '"That\'s the thing about people who think they hate computers. What they really hate is lousy programmers." – Larry Niven',
  '"First, solve the problem. Then, write the code." – John Johnson',
  '"Clean code always looks like it was written by someone who cares." – Michael Feathers',
  '"Of course, bad code can be cleaned up. But it\'s very expensive." – Ivar Jacobson',
  '"One of my most productive days was throwing away 1000 lines of code." – Ken Thompson',
  '"Simplicity is the soul of efficiency." – Austin Freeman',
  '"Before software can be reusable it first has to be usable." – Ralph Johnson',
  '"Make it work, make it right, make it fast." – Kent Beck',
  '"Software is a great combination between artistry and engineering." – Bill Gates',
  '"Strive for simplicity, but discover elegance." – Alan Perlis',
  '"Java is to JavaScript what car is to Carpet." – Chris Heilmann',
  '"The most disastrous thing that you can ever learn is your first programming language." – Edsger W. Dijkstra',
  '"Measuring programming progress by lines of code is like measuring aircraft building progress by weight." – Bill Gates',
  '"Debugging is twice as hard as writing the code in the first place." – Brian Kernighan',
  '"If debugging is the process of removing software bugs, then programming must be the process of putting them in." – Edsger W. Dijkstra',
  '"Walking on water and developing software from a specification are easy if both are frozen." – Edward V. Berard',
  '"Code is like humor. When you have to explain it, it’s bad." – Cory House',
  '"Perfecting a design is like carving a block of marble. It is done by removing material, not adding it." – Antoine de Saint-Exupéry',
  '"The best error message is the one that never shows up." – Thomas Fuchs',
  '"Optimism is an occupational hazard of programming: feedback is the treatment." – Kent Beck',
  '"A good programmer is someone who always looks both ways before crossing a one-way street." – Doug Linder',
  '"There are only two hard things in Computer Science: cache invalidation and naming things." – Phil Karlson',
  '"Don\'t document bad code – rewrite it." – Brian Kernighan',
  '"In software, the most beautiful structures are those that are simple and clear." – Grace Hopper',
  '"Software undergoes beta testing shortly before it’s released. Beta is Latin for \'still doesn\'t work\'." – Anonymous',
  '"Rules of Optimization: Rule 1: Don\'t do it. Rule 2 (for experts only): Rule 2: Don\'t do it yet." – Michael A. Jackson',
  '"Complexity kills. It sucks the life out of developers, it makes products difficult to plan, build and test." – Ray Ozzie'
];

function TypingQuote({ text }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 20); // Fast smooth typing
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className="inline-block transition-all duration-300">
      {displayedText}
      <span className="inline-block w-1.5 h-3 bg-gradient-to-b from-[#DC2626] to-[#2563EB] ml-1 animate-pulse shrink-0 align-middle" />
    </span>
  );
}

function WordsPullUp({ text, className = '', showAsterisk = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(' ');
  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((w, i) => (
        <motion.span key={i} className="inline-block mr-[0.25em] relative"
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          {w}
          {showAsterisk && i === words.length - 1 && (
            <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
          )}
        </motion.span>
      ))}
    </span>
  );
}

function WordsPullUpMultiStyle({ segments, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const allWords = [];
  segments.forEach(seg => {
    seg.text.split(' ').forEach(w => allWords.push({ word: w, className: seg.className || '' }));
  });
  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${className}`}>
      {allWords.map((item, i) => (
        <motion.span key={i} className={`inline-block mr-[0.25em] ${item.className}`}
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          {item.word}
        </motion.span>
      ))}
    </span>
  );
}

function AnimatedLetter({ char, index, total, progress }) {
  const p = index / total;
  const opacity = useTransform(progress, [Math.max(0, p - 0.1), Math.min(1, p + 0.05)], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}

function ScrollRevealText({ text, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.2'] });
  return (
    <p ref={ref} className={className} style={{ color: '#DEDBC8' }}>
      {text.split('').map((c, i) => (
        <AnimatedLetter key={i} char={c} index={i} total={text.length} progress={scrollYProgress} />
      ))}
    </p>
  );
}

function FeatureCard({ children, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  return (
    <motion.div ref={ref}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ delay: index * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="h-full">
      {children}
    </motion.div>
  );
}

// ── Nav Items ─────────────────────────────────────────────────
const NAV = [
  { label: 'About', to: '/about' },
  { label: 'Careers', to: '/careers' },
  { label: 'Blogs', to: '/blogs' },
  { label: 'Contact', to: '/contact' },
  { label: 'Login', to: '/login' },
];

const HEADER_NAV = [
  { label: 'About', to: '/about' },
  { label: 'Login', to: '/login' },
];

// ── Feature Cards Data ────────────────────────────────────────
const CARDS = [
  {
    type: 'video',
    src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4',
    label: '"Talk is cheap. Show me the code." – Linus Torvalds',
  },
  {
    num: '01', title: 'Thoughtful Discussions.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85',
    items: ['A space for meaningful conversations', 'Share ideas and get real feedback', 'Community that values depth over noise', 'Engage with developers who care'],
  },
  {
    num: '02', title: 'Project Showcase.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85',
    items: ['Share work with GitHub links and live previews', 'Get feedback from developers who understand your craft', 'Discover and be discovered by the right people'],
  },
  {
    num: '03', title: 'Private & Secure.',
    icon: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85',
    items: ['End-to-end encrypted personal messaging', 'No ads, no tracking, approved friends only', 'Real-time updates without hitting refresh'],
  },
];

// ── Main Component ────────────────────────────────────────────
export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOSUser, setIsIOSUser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % DEV_QUOTES.length);
    }, 5000); // Cycle quotes every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const [autoDismissTimer, setAutoDismissTimer] = useState(null);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOSUser(ios);

    // Detect if already installed / running in standalone mode
    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if the user closed the banner permanently
    const isBannerDismissedPermanently = localStorage.getItem('pwa_banner_dismissed_permanently') === 'true';

    // Show banner if not standalone and not dismissed permanently
    if (!standalone && !isBannerDismissedPermanently) {
      // Show banner after exactly 10 seconds
      const showTimer = setTimeout(() => {
        setShowInstallBanner(true);

        // Automatically remove the banner after another 10 seconds
        const hideTimer = setTimeout(() => {
          setShowInstallBanner(false);
        }, 10000);

        setAutoDismissTimer(hideTimer);
      }, 10000);

      return () => {
        clearTimeout(showTimer);
      };
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait for the 10-second delay timer to show instead of showing instantly
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIOSUser) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      if (autoDismissTimer) {
        clearTimeout(autoDismissTimer);
      }
    } else {
      alert('To install Discuss:\n\n• On Chrome/Edge: Click the install icon in the URL search bar.\n• On Mobile: Tap the 3 dots menu and select "Install App".');
    }
  };

  const dismissBanner = (isPermanent = false) => {
    setShowInstallBanner(false);
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
    }
    if (isPermanent) {
      localStorage.setItem('pwa_banner_dismissed_permanently', 'true');
    }
  };

  useEffect(() => { if (!authLoading && user) navigate('/feed', { replace: true }); }, [user, authLoading, navigate]);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1800); return () => clearTimeout(t); }, []);

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#DEDBC8' }} />
      </div>
    );
  }
  if (!ready) return <LoadingScreen message="Preparing your experience..." />;

  return (
    <div className="lp-page min-h-screen pt-16">

      {/* Floating Fixed Header Overlay */}
      <div className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
        {/* Left Spacer to align center */}
        <div className="w-12 h-6 hidden md:block"></div>

        {/* Center Navbar pill */}
        <div className="bg-black/95 backdrop-blur-md rounded-full border border-white/10 px-4 py-2 shadow-2xl">
          <div className="flex items-center gap-6 md:gap-8">
            {HEADER_NAV.map(n => (
              <Link key={n.label} to={n.to}
                className="text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 shining-grey-text hover:scale-105 active:scale-95 px-2.5 py-0.5"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right brand logo & install button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-full border border-white/10 hover:border-[#DC2626]/30 bg-black/50 text-[10px] md:text-xs font-semibold text-gray-300 hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.15)] transition-all select-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-0.5 text-xs sm:text-sm md:text-base font-extrabold tracking-tight hover:scale-105 active:scale-95 transition-all select-none bg-black/50 px-3 py-1.5 rounded-full border border-white/5"
          >
            <span className="text-[#E53E3E] font-black text-sm sm:text-base md:text-lg">&lt;</span>
            <span className="text-white font-extrabold tracking-tight">discuss</span>
            <span className="text-[#3182CE] font-black text-sm sm:text-base md:text-lg">&gt;</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="h-[calc(100vh-4rem)] p-4 md:p-6">
        <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden">
          {/* Video */}
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4" type="video/mp4" />
          </video>
          {/* Overlays */}
          <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

          {/* Hero content — aligned perfectly to prevent overlap */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:px-8 md:pb-4 lg:px-10 lg:pb-5 flex flex-col justify-end min-h-[40%]">
            {/* Giant heading on its own row to fully expand without squishing */}
            <div className="w-full select-none mb-2 md:mb-3">
              <h1 className="text-[21vw] sm:text-[19vw] md:text-[17vw] lg:text-[15vw] xl:text-[14vw] 2xl:text-[13vw] font-black leading-[0.8] tracking-[-0.07em] pointer-events-none"
                style={{ color: '#E1E0CC' }}>
                <WordsPullUp text="discuss" showAsterisk />
              </h1>
            </div>

            {/* Description & CTA row underneath giant heading to completely eliminate overlaps */}
            <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2 border-t border-white/10">
              <div className="max-w-xl">
                <motion.p
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xs sm:text-sm md:text-base font-medium leading-relaxed"
                  style={{ color: 'rgba(222,219,200,0.75)' }}>
                  Discuss is a curated editorial platform for developers to share ideas, projects, and meaningful conversations — without noise, ads, or distractions.
                </motion.p>
              </div>
              <div className="flex-shrink-0 flex items-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                  <Link to="/register"
                    className="group inline-flex items-center gap-1.5 hover:gap-3 transition-all duration-300 rounded-full pl-4 sm:pl-5 pr-1 py-1 sm:py-1.5 shadow-xl"
                    style={{ background: '#DEDBC8' }}>
                    <span className="text-black font-semibold text-sm sm:text-base whitespace-nowrap">Get Started</span>
                    <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#DEDBC8' }} />
                    </span>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — ABOUT
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-black py-20 sm:py-28 md:py-36 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Card with thick red-to-blue gradient border decoration at the top */}
          <div className="relative bg-[#101010] rounded-2xl md:rounded-3xl overflow-hidden pt-1.5 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

            <div className="px-6 sm:px-10 md:px-16 py-12 sm:py-16 md:py-20 text-center">
              {/* Label with thick red and blue bullet dots */}
              <motion.span
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 text-[10px] sm:text-xs tracking-[0.2.5em] font-bold uppercase mb-6 sm:mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-[#DC2626] shadow-[0_0_8px_#DC2626]"></span>
                <span style={{ color: '#DEDBC8' }}>Developer-First Platform</span>
                <span className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_8px_#2563EB]"></span>
              </motion.span>

              {/* Multi-style heading */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9] mb-8 sm:mb-12">
                <WordsPullUpMultiStyle segments={[
                  { text: 'A space for developers,', className: 'font-normal' },
                  { text: 'built to connect.', className: 'italic font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#DC2626] to-[#2563EB]' },
                  { text: 'Share projects, ideas, and grow with peers who get it.', className: 'font-normal' },
                ]} />
              </h2>

              {/* Scroll-linked paragraph */}
              <div className="max-w-2xl mx-auto">
                <ScrollRevealText
                  text="Over the last few years, Discuss has grown into a platform where developers from around the world share projects, exchange feedback, and find their community. A clean, focused space built without distractions — just real conversations and meaningful work."
                  className="text-xs sm:text-sm md:text-base leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — FEATURES
          ═══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen bg-black py-20 sm:py-28 px-4 sm:px-6">
        <div className="bg-noise absolute inset-0 opacity-[0.15] pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal mb-2">
              <WordsPullUpMultiStyle segments={[
                { text: 'Everything you need for your developer journey.', className: '' },
              ]} />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-gray-500">
              Built for focus. Powered by community.
            </motion.p>
            {/* Thick brand color divider line */}
            <div className="w-24 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] mx-auto mt-6 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.3)]" />
          </div>

          {/* 4-column card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:h-[480px]">
            {CARDS.map((card, i) => (
              <FeatureCard key={i} index={i}>
                {card.type === 'video' ? (
                  <div className="relative h-full min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden group shadow-xl border border-white/5 transition-transform hover:scale-[1.02] duration-300">
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                      <source src={card.src} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      {/* Premium styled quote overlay with double quotes and red/blue accent block */}
                      <div className="flex gap-2">
                        <div className="w-1.5 h-auto bg-gradient-to-b from-[#DC2626] to-[#2563EB] rounded-full flex-shrink-0" />
                        <p className="text-xs sm:text-sm font-semibold italic leading-relaxed min-h-[4rem]" style={{ color: '#E1E0CC' }}>
                          <TypingQuote text={DEV_QUOTES[quoteIndex]} />
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#181818] hover:bg-[#202020] rounded-2xl p-6 h-full flex flex-col border border-white/5 hover:border-[#DC2626]/30 hover:shadow-[0_8px_32px_rgba(220,38,38,0.08)] transition-all duration-300 group">
                    <div className="relative mb-4 flex-shrink-0">
                      <img src={card.icon} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#DC2626] to-[#2563EB]" />
                    </div>

                    <div className="flex items-baseline gap-2 mb-4">
                      <h3 className="text-base sm:text-lg font-bold" style={{ color: '#E1E0CC' }}>{card.title}</h3>
                      <span className="text-gray-500 font-mono text-xs ml-auto">{card.num}</span>
                    </div>

                    <ul className="space-y-3 flex-1">
                      {card.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-gray-400 text-xs sm:text-sm">
                          {/* Rich checkicon highlighting red or blue based on index */}
                          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: j % 2 === 0 ? '#DC2626' : '#2563EB' }} />
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 pt-4 border-t border-white/10 flex-shrink-0">
                      <Link to="/register"
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors"
                        style={{ color: 'rgba(222,219,200,0.75)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(222,219,200,0.75)')}>
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" style={{ transform: 'rotate(-45deg)', color: '#2563EB' }} />
                      </Link>
                    </div>
                  </div>
                )}
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer className="bg-black border-t border-white/10 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold italic" style={{ color: '#DEDBC8' }}>
            &lt;<span>discuss</span>/&gt;
          </span>
          <div className="flex items-center gap-6 text-xs sm:text-sm">
            {NAV.slice(0, 4).map(n => (
              <Link key={n.label} to={n.to} className="transition-colors"
                style={{ color: 'rgba(225,224,204,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#E1E0CC')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(225,224,204,0.5)')}>
                {n.label}
              </Link>
            ))}
          </div>
          <div className="text-xs text-center sm:text-right" style={{ color: 'rgba(225,224,204,0.4)' }}>
            &copy; {new Date().getFullYear()} Discuss. Built by{' '}
            <a
              href="https://www.maazportfolio.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="shining-red-blue-text font-black hover:underline"
            >
              &lt;mma/&gt;
            </a>{' '}
            in collaboration with{' '}
            <Link
              to="/about#digitalclink"
              className="shining-purple-text font-black hover:underline"
            >
              DigitalClink
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating PWA Install Banner */}
      {showInstallBanner && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[99] bg-gradient-to-r from-[#101010]/98 to-[#171717]/98 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 transition-all duration-300"
        >
          {/* Pulsing Accent Glow Bar */}
          <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-[#DC2626] to-[#2563EB]" />

          <div className="flex items-start gap-4 pl-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#2563EB] flex items-center justify-center shadow-lg flex-shrink-0 animate-pulse">
              <span className="text-white font-extrabold text-lg select-none">&lt;/&gt;</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-white mb-1">Install Discuss Hub</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Add Discuss directly to your home screen for lightning-fast speeds, offline chat support, and notifications.
              </p>
            </div>
            <button 
              onClick={() => dismissBanner(true)} 
              className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 pl-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#DEDBC8] text-black hover:bg-[#DEDBC8]/90 transition-all shadow-md text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {isIOSUser ? 'Show iOS Steps' : 'Install Now'}
            </button>
            <button
              onClick={() => dismissBanner(false)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-[#101010] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 flex flex-col gap-5">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#DC2626]" />
                <h3 className="text-base font-bold text-white">Add to Home Screen</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed text-center">
              Safari on iOS does not support one-tap web installs. Follow these 3 simple steps to add **Discuss** to your home screen:
            </p>

            <div className="flex flex-col gap-4 font-sans">
              <div className="flex items-start gap-3 bg-[#181818] p-3 rounded-xl border border-white/5">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-mono font-bold text-[#DC2626] flex-shrink-0">
                  01
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  Tap the <strong className="text-white">Share button</strong> (square with an up arrow <Share className="w-3.5 h-3.5 inline mx-0.5 align-middle text-[#2563EB]" />) in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#181818] p-3 rounded-xl border border-white/5">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-mono font-bold text-[#2563EB] flex-shrink-0">
                  02
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  Scroll down the share sheet menu and tap <strong className="text-white">Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 align-middle text-[#DC2626]" />).
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#181818] p-3 rounded-xl border border-white/5">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-mono font-bold text-white flex-shrink-0">
                  03
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  Tap <strong className="text-white">Add</strong> in the top right corner of your screen to complete. Done!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#DEDBC8] text-black hover:bg-[#DEDBC8]/90 transition-colors shadow-md text-center mt-2 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shine-grey {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shining-grey-text {
          background: linear-gradient(120deg, #6B7280 20%, #F3F4F6 50%, #6B7280 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-grey 4s linear infinite;
          text-shadow: 0 0 8px rgba(156, 163, 175, 0.15);
          display: inline-block;
        }
        @keyframes shine-purple {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shine-red-blue {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shining-purple-text {
          background: linear-gradient(120deg, #6B21A8 25%, #C084FC 50%, #6B21A8 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-purple 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(107, 33, 168, 0.35);
          font-weight: 800;
          display: inline-block;
        }
        .shining-red-blue-text {
          background: linear-gradient(120deg, #DC2626 25%, #93C5FD 50%, #2563EB 75%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-red-blue 3.5s linear infinite;
          text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          font-weight: 800;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}
