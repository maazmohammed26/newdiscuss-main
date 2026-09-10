import React, { useState, useEffect, useRef } from 'react';
import {
  DiscussLoadingDots,
  DelayedNetworkLoader,
  FocusReveal,
  AdaptiveLoadBoundary,
  SectionSkeleton,
} from '@/components/loading';
import PostSafetyModal from '@/components/PostSafetyModal';
import { ShieldCheck, Play, RotateCcw, AlertTriangle, WifiOff, CheckCircle2, Sparkles } from 'lucide-react';

/**
 * LoadingPreviewPage
 * 
 * DEVELOPMENT-ONLY Motion & Adaptive Hybrid Loading Playground.
 * Strictly excluded from production builds.
 * 
 * Demonstrates and verifies:
 * A. DiscussLoadingDots: inline, sm, md, lg variants
 * B. DelayedNetworkLoader: Fast (200ms), Slow (800ms), Heavy (2s)
 * C. FocusReveal STANDARD (4-5px blur, 220ms)
 * D. FocusReveal HERO (6-7px blur, 280ms)
 * E. FocusReveal MEDIA (8-10px blur, 300ms)
 * F. AdaptiveLoadBoundary: Skeleton -> Delayed Dots -> Focus Reveal
 * G. Error state: Skeleton -> Dots -> Error with Retry
 * H. Offline state: Valid Cache vs Uncached Offline
 * I. Live PostSafetyModal Content Review testing (10x rapid run verification)
 */
export default function LoadingPreviewPage() {
  // A. Dots Size Toggle
  const [dotColor, setDotColor] = useState('text-[#0095F6]');

  // B. Delayed Network Loader states
  const [fastActive, setFastActive] = useState(false);
  const [slowActive, setSlowActive] = useState(false);
  const [longActive, setLongActive] = useState(false);

  // C, D, E. Focus Reveal Replay Keys
  const [standardKey, setStandardKey] = useState(1);
  const [heroKey, setHeroKey] = useState(1);
  const [mediaKey, setMediaKey] = useState(1);

  // F. Adaptive Load Boundary simulation
  const [adaptivePhase, setAdaptivePhase] = useState('idle'); // 'idle' | 'loading' | 'resolved'
  const adaptiveTimerRef = useRef(null);

  // G. Error Simulation
  const [errorPhase, setErrorPhase] = useState('idle'); // 'idle' | 'loading' | 'error'
  const errorTimerRef = useRef(null);

  // H. Offline Simulation
  const [offlineHasCache, setOfflineHasCache] = useState(true);

  // I. Live Content Review Modal Test
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [testPostType, setTestPostType] = useState('safe');
  const [reviewRunCount, setReviewRunCount] = useState(0);

  const mockPosts = {
    safe: {
      id: 'dev_post_safe_1',
      title: 'Building performant React interfaces with adaptive loading',
      content: 'Using CSS transforms and blur-to-clear transitions creates calm and responsive user interfaces.',
      code: 'const result = await fetch(url);',
      author_username: 'maaz',
    },
    review: {
      id: 'dev_post_review_2',
      title: 'Why are some comments so hostile?',
      content: 'You are an idiot if you do not understand this simple architecture.',
      code: '',
      author_username: 'alex',
    },
    high_risk: {
      id: 'dev_post_highrisk_3',
      title: 'Double your crypto fast guaranteed 1000% return',
      content: 'Send private key and seed phrase to telegram @fast_crypto_scam to claim free btc.',
      code: '',
      author_username: 'spammer',
    },
  };

  const startFastLoader = () => {
    setFastActive(true);
    setTimeout(() => setFastActive(false), 200);
  };

  const startSlowLoader = () => {
    setSlowActive(true);
    setTimeout(() => setSlowActive(false), 800);
  };

  const startLongLoader = () => {
    setLongActive(true);
    setTimeout(() => setLongActive(false), 2000);
  };

  const startAdaptiveSimulation = () => {
    if (adaptiveTimerRef.current) clearTimeout(adaptiveTimerRef.current);
    setAdaptivePhase('loading');
    adaptiveTimerRef.current = setTimeout(() => {
      setAdaptivePhase('resolved');
    }, 1200);
  };

  const startErrorSimulation = () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorPhase('loading');
    errorTimerRef.current = setTimeout(() => {
      setErrorPhase('error');
    }, 1000);
  };

  const openContentReview = (type) => {
    setTestPostType(type);
    setReviewRunCount((c) => c + 1);
    setReviewModalOpen(true);
  };

  useEffect(() => {
    return () => {
      if (adaptiveTimerRef.current) clearTimeout(adaptiveTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#000000] text-neutral-900 dark:text-neutral-100 p-6 md:p-10 font-sans select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-500/10 text-[#0095F6]">
                <Sparkles className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Discuss Loading & Motion Lab</h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Development-Only Motion Playground • Not exported to production builds
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              DEV MODE ONLY
            </span>
          </div>
        </div>

        {/* Section A: DiscussLoadingDots */}
        <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-bold">A. Discuss Loading Dots Primitives</h2>
              <p className="text-xs text-neutral-500">Geometry and pulse timing reproduction of loading.json</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDotColor('text-[#0095F6]')}
                className={`w-5 h-5 rounded-full bg-[#0095F6] ${dotColor.includes('0095F6') ? 'ring-2 ring-offset-2 ring-[#0095F6]' : ''}`}
                title="Discuss Blue"
              />
              <button
                type="button"
                onClick={() => setDotColor('text-neutral-400')}
                className={`w-5 h-5 rounded-full bg-neutral-400 ${dotColor.includes('neutral') ? 'ring-2 ring-offset-2 ring-neutral-400' : ''}`}
                title="Neutral"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400">INLINE</span>
              <DiscussLoadingDots size="inline" color={dotColor} />
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400">SMALL (sm)</span>
              <DiscussLoadingDots size="sm" color={dotColor} />
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400">MEDIUM (md)</span>
              <DiscussLoadingDots size="md" color={dotColor} />
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400">LARGE (lg)</span>
              <DiscussLoadingDots size="lg" color={dotColor} />
            </div>
          </div>
        </div>

        {/* Section B: Delayed Network Loader */}
        <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h2 className="text-sm font-bold">B. Delayed Network Loader (600ms Threshold)</h2>
            <p className="text-xs text-neutral-500">Fast operations never flicker a loader. Slow operations smoothly reveal dots.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fast 200ms */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-between gap-4">
              <div className="text-center">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">FAST (200ms)</span>
                <p className="text-[11px] text-neutral-500 mt-1">Under 600ms threshold: zero loader flash</p>
              </div>
              <div className="h-10 flex items-center justify-center">
                <DelayedNetworkLoader active={fastActive} delay={600} size="sm" />
                {!fastActive && <span className="text-xs text-neutral-400">Inactive</span>}
              </div>
              <button
                type="button"
                onClick={startFastLoader}
                disabled={fastActive}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {fastActive ? 'Running...' : 'Test 200ms Fast'}
              </button>
            </div>

            {/* Slow 800ms */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-between gap-4">
              <div className="text-center">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">NOTICEABLE (800ms)</span>
                <p className="text-[11px] text-neutral-500 mt-1">Exceeds 600ms: dots appear calmly</p>
              </div>
              <div className="h-10 flex items-center justify-center">
                <DelayedNetworkLoader active={slowActive} delay={600} minVisible={220} size="sm" />
                {!slowActive && <span className="text-xs text-neutral-400">Inactive</span>}
              </div>
              <button
                type="button"
                onClick={startSlowLoader}
                disabled={slowActive}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {slowActive ? 'Running...' : 'Test 800ms Slow'}
              </button>
            </div>

            {/* Slow 2000ms */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center justify-between gap-4">
              <div className="text-center">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">LONG WAIT (2s)</span>
                <p className="text-[11px] text-neutral-500 mt-1">Dots stay visible until data resolves</p>
              </div>
              <div className="h-10 flex items-center justify-center">
                <DelayedNetworkLoader active={longActive} delay={600} minVisible={220} size="sm" />
                {!longActive && <span className="text-xs text-neutral-400">Inactive</span>}
              </div>
              <button
                type="button"
                onClick={startLongLoader}
                disabled={longActive}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {longActive ? 'Running...' : 'Test 2000ms Long'}
              </button>
            </div>
          </div>
        </div>

        {/* Section C, D, E: FocusReveal Physics Variants */}
        <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h2 className="text-sm font-bold">C, D, E. Focus Reveal Motion Primitives</h2>
            <p className="text-xs text-neutral-500">Soft focus into crisp clarity with zero fog and immediate GPU layer cleanup.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Standard */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">STANDARD</span>
                  <span className="text-[10px] text-neutral-500">4px blur • 220ms</span>
                </div>
                <FocusReveal ready={true} revealKey={`std_${standardKey}`} variant="standard">
                  <div className="p-3 bg-white dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                    <p className="font-semibold text-neutral-900 dark:text-white">Text & Search Cards</p>
                    <p className="text-neutral-500 text-[11px] mt-0.5">Subtle focus used on feed posts and search results.</p>
                  </div>
                </FocusReveal>
              </div>
              <button
                type="button"
                onClick={() => setStandardKey((k) => k + 1)}
                className="w-full py-1 px-2 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay Standard</span>
              </button>
            </div>

            {/* Hero */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">HERO</span>
                  <span className="text-[10px] text-neutral-500">6px blur • 280ms</span>
                </div>
                <FocusReveal ready={true} revealKey={`hero_${heroKey}`} variant="hero">
                  <div className="p-3 bg-white dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="h-12 rounded bg-gradient-to-r from-blue-500/20 to-purple-500/20 mb-2 flex items-center justify-center text-[11px] font-bold text-blue-600">
                      Profile Header Banner
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">User Identity Card</p>
                  </div>
                </FocusReveal>
              </div>
              <button
                type="button"
                onClick={() => setHeroKey((k) => k + 1)}
                className="w-full py-1 px-2 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay Hero</span>
              </button>
            </div>

            {/* Media */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">MEDIA</span>
                  <span className="text-[10px] text-neutral-500">8px blur • 300ms</span>
                </div>
                <FocusReveal ready={true} revealKey={`media_${mediaKey}`} variant="media">
                  <div className="p-3 bg-white dark:bg-black rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="h-12 rounded bg-gradient-to-tr from-amber-500/20 to-rose-500/20 mb-2 flex items-center justify-center text-[11px] font-bold text-rose-600">
                      Pulse Video & Images
                    </div>
                    <p className="font-semibold text-neutral-900 dark:text-white">Resilient Media Frame</p>
                  </div>
                </FocusReveal>
              </div>
              <button
                type="button"
                onClick={() => setMediaKey((k) => k + 1)}
                className="w-full py-1 px-2 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay Media</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section F: Adaptive Load Boundary Full Flow */}
        <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-bold">F. Adaptive Load Boundary (Skeleton → Delayed Dots → Focus Reveal)</h2>
              <p className="text-xs text-neutral-500">Simulates full lifecycle without loader stacking over shimmers.</p>
            </div>
            <button
              type="button"
              onClick={startAdaptiveSimulation}
              className="py-1 px-3 rounded-lg text-xs font-semibold bg-[#0095F6] text-white hover:bg-[#0081D6] flex items-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>Simulate Full Flow</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <AdaptiveLoadBoundary
              isLoading={adaptivePhase === 'loading'}
              hasData={adaptivePhase === 'resolved'}
              loaderDelay={400}
              skeleton={<SectionSkeleton variant="post" lines={3} />}
              focusVariant="standard"
            >
              <div className="p-4 bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    D
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">Discuss Core Team</div>
                    <div className="text-[10px] text-neutral-400">Bengaluru • Just now</div>
                  </div>
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200">
                  Adaptive Hybrid Loading ensures instantaneous rendering on cache hits, calm loading dots on slow connections, and smooth focus reveals.
                </p>
              </div>
            </AdaptiveLoadBoundary>
          </div>
        </div>

        {/* Section G & H: Error & Offline Simulation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* G. Error Simulation */}
          <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <h2 className="text-sm font-bold">G. Error Termination & Retry</h2>
              <p className="text-xs text-neutral-500">Loader exits into actionable error state.</p>
            </div>

            <div className="min-h-[120px] flex flex-col justify-center">
              <AdaptiveLoadBoundary
                isLoading={errorPhase === 'loading'}
                hasData={false}
                loaderDelay={300}
                skeleton={<SectionSkeleton variant="card" lines={2} />}
                error={errorPhase === 'error'}
                errorFallback={
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Failed to fetch updates</span>
                    </div>
                    <p className="text-neutral-500">Network connection timed out. Retry whenever ready.</p>
                    <button
                      type="button"
                      onClick={startErrorSimulation}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold"
                    >
                      Retry Action
                    </button>
                  </div>
                }
              >
                <div>Resolved</div>
              </AdaptiveLoadBoundary>
            </div>

            <button
              type="button"
              onClick={startErrorSimulation}
              className="w-full py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Simulate Network Error
            </button>
          </div>

          {/* H. Offline Simulation */}
          <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <h2 className="text-sm font-bold">H. Offline Behavior</h2>
              <p className="text-xs text-neutral-500">Valid cache stays visible; uncached shows offline.</p>
            </div>

            <div className="min-h-[120px] flex flex-col justify-center">
              {offlineHasCache ? (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Cached Content Preserved</span>
                    <span className="text-[10px] text-neutral-400">Offline</span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300">
                    Existing posts remain fully readable and interactive while offline.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                    <WifiOff className="w-4 h-4 text-neutral-400" />
                    <span>No internet connection</span>
                  </div>
                  <p className="text-neutral-500">Connect to Wi-Fi or cellular data to load fresh content.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOfflineHasCache((c) => !c)}
              className="w-full py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Toggle Cache State ({offlineHasCache ? 'Currently Cached' : 'No Cache'})
            </button>
          </div>
        </div>

        {/* Section I: Live Content Review Modal Zero-Flicker Verification */}
        <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-bold">I. Content Review Zero-Flicker Verification</h2>
              <p className="text-xs text-neutral-500">
                Trigger Content Review repeatedly to confirm zero second-flicker, atomic result commit, and one-shot FocusReveal.
              </p>
            </div>
            <span className="text-xs font-semibold text-neutral-400">
              Runs tested: <span className="text-[#0095F6] font-bold">{reviewRunCount}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => openContentReview('safe')}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50 hover:bg-emerald-50/5 dark:hover:bg-emerald-950/10 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Test SAFE Content</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Normal engineering discussion post</p>
            </button>

            <button
              type="button"
              onClick={() => openContentReview('review')}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-amber-500/50 hover:bg-amber-50/5 dark:hover:bg-amber-950/10 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Test REVIEW Content</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Mild hostility or borderline language</p>
            </button>

            <button
              type="button"
              onClick={() => openContentReview('high_risk')}
              className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-rose-500/50 hover:bg-rose-50/5 dark:hover:bg-rose-950/10 text-left transition-all"
            >
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Test HIGH RISK Content</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Severe violation or financial scam</p>
            </button>
          </div>
        </div>

      </div>

      {/* Live PostSafetyModal Instance */}
      {reviewModalOpen && (
        <PostSafetyModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          post={mockPosts[testPostType]}
        />
      )}
    </div>
  );
}
