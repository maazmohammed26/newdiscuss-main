import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Monitor, Share, Terminal, Sparkles, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AppInstallBanner — Premium Cybernetic HUD Style PWA Installer
 * Features:
 *  - 5-second initial mount delay.
 *  - 8-second expanded banner window before auto-minimizing.
 *  - Fixed mobile cutoff layout by using left-4 right-4 md:left-auto md:right-8 md:w-[390px] (no translate-x clashing).
 *  - Highly professional status-HUD layout with minimal text and clean developer accents.
 *  - Minimized state: Positioned directly on the right edge of the screen, sliding 50% off-screen
 *    to show only a single "<" tag, preventing float pollution.
 *  - Premium rotating conic-gradient shining border sweep animation wrapping the circle perfectly.
 *  - Direct APK download triggers a gorgeous dedicated pop-up modal showing "Official Discuss APP",
 *    rating stats, v2.0.0 specs, scrollable hidden-scrollbar description, and a 3-second animated download loading sequence.
 *  - Interaction (APK modal or PWA install click) auto-dismisses the expanded widget to the docked tab forever.
 *  - Suppressed inside mobile WebView wrappers.
 */
export default function AppInstallBanner() {
  const [platform, setPlatform] = useState('desktop'); // 'android', 'ios', 'mac', 'desktop'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // APK Pop-up Modal States
  const [showAPKModal, setShowAPKModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // 1. Silently suppress inside mobile app Native WebViews
    const isMedianApp = typeof window !== 'undefined' && (
      window.median !== undefined ||
      window.gonative !== undefined ||
      navigator.userAgent.includes('Median') ||
      navigator.userAgent.includes('GoNative')
    );
    if (isMedianApp) return;

    // 2. Platform & Browser Detection
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);
    const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) && !isIOS;

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else if (isMac) {
      setPlatform('mac');
    } else {
      setPlatform('desktop');
    }

    // 3. Load localStorage dismissed state
    const dismissedFlag = localStorage.getItem('discuss_install_widget_dismissed') === 'true';
    setIsDismissed(dismissedFlag);

    // 4. Initial Mount Timing Sequence (5 Seconds Delay)
    const initTimer = setTimeout(() => {
      setVisible(true);

      if (dismissedFlag) {
        // Start minimized directly, never expand automatically
        setMinimized(true);
      } else {
        // Expand full box
        setMinimized(false);

        // Auto-minimize after exactly 8 seconds of expanded exposure
        const autoMinimizeTimer = setTimeout(() => {
          setMinimized(true);
        }, 8000);

        return () => clearTimeout(autoMinimizeTimer);
      }
    }, 5000);

    return () => clearTimeout(initTimer);
  }, []);

  // 5. Catch Native PWA Install Prompts
  useEffect(() => {
    const handleBeforePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
    };
  }, []);

  // Explicit Close Action (Clicks X)
  const handleDismiss = (e) => {
    e.stopPropagation();
    setMinimized(true);
    setIsDismissed(true);
    localStorage.setItem('discuss_install_widget_dismissed', 'true');
    toast.success('Install widget minimized to right edge of page.');
  };

  // Trigger PWA Installation Flow
  const handlePWAInstall = async () => {
    // Save dismissed state in localStorage on interaction
    localStorage.setItem('discuss_install_widget_dismissed', 'true');
    setIsDismissed(true);
    setMinimized(true);

    if (!deferredPrompt) {
      toast.info('PWA Installation ready. Tap your browser settings (3 dots) and select "Add to Home Screen" or "Install App".');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Welcome to the standalone Discuss app experience!');
      setDeferredPrompt(null);
    }
  };

  // Direct APK Click -> Opens High-Fidelity Custom Download Pop-up Modal
  const handleAPKClick = () => {
    // Save dismissed state in localStorage immediately, auto-minimize widget in the background
    localStorage.setItem('discuss_install_widget_dismissed', 'true');
    setIsDismissed(true);
    setMinimized(true);

    // Open premium custom download popup
    setShowAPKModal(true);
  };

  // Modal Download Button Sequence (3 Seconds Loading Progress animation)
  const startSecureDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    // Increment progress dynamically over 3000ms (3 seconds)
    const intervalTime = 30; // ms per update
    const totalSteps = 3000 / intervalTime; // 100 steps
    let currentStep = 0;

    const progressTimer = setInterval(() => {
      currentStep++;
      const percent = Math.min(Math.round((currentStep / totalSteps) * 100), 100);
      setDownloadProgress(percent);

      if (currentStep >= totalSteps) {
        clearInterval(progressTimer);
        
        // Complete download & trigger file fetch
        toast.success('Download successfully initialized. Storing Discuss APK.');
        window.location.href = 'https://www.discussit.in/app/discussit.apk';
        
        // Delayed modal close for premium presentation
        setTimeout(() => {
          setShowAPKModal(false);
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 800);
      }
    }, intervalTime);
  };

  if (!visible) return null;

  // Premium, highly concise platform status details
  const getPlatformDetails = () => {
    switch (platform) {
      case 'android':
        return {
          title: 'Discuss for Android',
          desc: 'Deploy native Android package. Available via direct APK download (4.4 ★) or secure standalone PWA container.',
          badge: 'APK + PWA Client',
        };
      case 'ios':
        return {
          title: 'Discuss for iOS',
          desc: 'Safari: Tap the share sheet icon and select "Add to Home Screen" to install standalone full-screen client.',
          badge: 'iOS Client',
        };
      case 'mac':
        return {
          title: 'Discuss for macOS',
          desc: 'Launch native sandboxed Darwin desktop client. Support multi-window, launching speed and secure chats.',
          badge: 'macOS Client',
        };
      case 'desktop':
      default:
        return {
          title: 'Discuss Standalone Client',
          desc: 'Initialize direct standalone client. Pin to taskbar or desktop for lightning speeds and direct launch.',
          badge: 'Desktop Client',
        };
    }
  };

  const details = getPlatformDetails();

  return (
    <>
      {/* Global CSS Inject for perfect rotating border shine, hidden scrollbars, & HUD pulsing */}
      <style>{`
        @keyframes cyber-border-spin {
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes cyber-hud-pulsing {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.25);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65), 0 0 15px rgba(239, 68, 68, 0.1);
          }
          50% {
            border-color: rgba(37, 99, 235, 0.35);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.75), 0 0 25px rgba(37, 99, 235, 0.15);
          }
        }
        
        /* The Conic Gradient Border Sweep */
        .cyber-spin-border-wrap {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          padding: 1.5px; /* Exact premium border width */
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 18px rgba(239, 68, 68, 0.45);
        }
        .cyber-spin-border-wrap::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 15%,
            #ef4444 50%,
            transparent 65%,
            #2563eb 85%,
            transparent 100%
          );
          animation: cyber-border-spin 2.6s linear infinite;
          z-index: 1;
        }
        .cyber-spin-border-inner {
          position: relative;
          width: 100%;
          height: 100%;
          background: rgba(8, 8, 12, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 50%;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding-left: 9px; /* Aligns "<" perfectly centered inside the visible left half of the circle */
        }
        
        .cyber-hud-card {
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(239, 68, 68, 0.25);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
          animation: cyber-hud-pulsing 6s infinite ease-in-out;
        }
        .cyber-glow-badge {
          box-shadow: 0 0 8px #ef4444;
        }

        /* Premium Hidden Scrollbar utility */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      <AnimatePresence mode="wait">
        {minimized ? (
          /* =========================================================================
             MINIMIZED EDGE-DOCK TAB STATE (ONLY SHOWS "<" TAG WITH SWEEP SHINE)
             ========================================================================= */
          <motion.div
            key="minimized-widget"
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 20 }} /* Translated 20px off-screen */
            whileHover={{ x: 8 }} /* Slides out slightly on hover */
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={() => setMinimized(false)}
            className="fixed bottom-28 right-0 z-[9999] flex items-center justify-center cursor-pointer select-none"
            title="Expand App Installer"
          >
            {/* The Conic-Gradient Spin Outer Wrapper */}
            <div className="cyber-spin-border-wrap">
              {/* Dark Glass Core displaying only "<" perfectly centered on the visible edge */}
              <div className="cyber-spin-border-inner">
                <span className="font-mono text-lg font-black tracking-widest text-[#E1E0CC]">&lt;</span>
              </div>
              
              {/* Mixed Pulsing Red Tag - Positioned at top-left to stay fully visible */}
              <span className="absolute top-0 left-0 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center cyber-glow-badge z-20">
                <span className="absolute inset-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.6s' }} />
              </span>
            </div>
          </motion.div>
        ) : (
          /* =========================================================================
             EXPANDED TECHIE HUD INSTAL CARD STATE
             ========================================================================= */
          <motion.div
            key="expanded-widget"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[390px] z-[9999] rounded-2xl overflow-hidden cyber-hud-card select-none text-white p-4"
          >
            {/* Pulsing Cyber Neon Top Strip Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-red-500 via-purple-500 to-blue-600" />
            
            {/* Futuristic Tech HUD Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 font-mono">
              <div className="flex items-center gap-2">
                <Terminal size={13} className="text-red-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold font-mono">
                  // DEPLOY: {platform.toUpperCase()}_CORE
                </span>
              </div>
              <button 
                onClick={handleDismiss}
                className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-all"
                title="Minimize widget"
              >
                <X size={13} />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-3 pr-0.5">
              
              {/* Dynamic OS Title & Badges */}
              <div className="space-y-1">
                <h4 className="font-bold text-sm tracking-wide text-[#E1E0CC] flex items-center gap-1.5 font-mono">
                  {details.title}
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-sans font-bold flex items-center gap-0.5">
                    <Sparkles size={8} /> {details.badge}
                  </span>
                </h4>

                {/* Highly compact premium description */}
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  {details.desc}
                </p>
              </div>

              {/* iOS Manual Installation steps block inside dark code layout */}
              {platform === 'ios' && (
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1 text-neutral-300">
                    <span className="text-red-400 font-bold">01.</span>
                    <span className="flex-1">Tap <strong className="text-white">Share</strong> in Safari bottom bar</span>
                    <Share size={11} className="text-blue-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1 text-neutral-300">
                    <span className="text-red-400 font-bold">02.</span>
                    <span className="flex-1">Select <strong className="text-white">"Add to Home Screen"</strong></span>
                    <span className="text-red-500 font-bold font-mono">+</span>
                  </div>
                </div>
              )}

              {/* CTA Action Bar */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-white/5">
                
                {/* Android Action CTA */}
                {platform === 'android' && (
                  <div className="flex flex-row gap-2 w-full">
                    <button
                      onClick={handleAPKClick}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all text-xs font-bold font-sans text-neutral-300 cursor-pointer"
                    >
                      <Download size={12} className="text-red-400 shrink-0" />
                      Direct APK
                    </button>
                    <button
                      onClick={handlePWAInstall}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                    >
                      <Smartphone size={12} className="shrink-0" />
                      Install (PWA)
                    </button>
                  </div>
                )}

                {/* macOS CTA */}
                {platform === 'mac' && (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                  >
                    <Monitor size={12} className="shrink-0" />
                    Install macOS App
                  </button>
                )}

                {/* Windows/Generic Desktop CTA */}
                {platform === 'desktop' && (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                  >
                    <Monitor size={12} className="shrink-0" />
                    Install Standalone
                  </button>
                )}

                {/* iOS Safari validation text */}
                {platform === 'ios' && (
                  <div className="flex items-center gap-1 w-full text-[10px] text-neutral-400 font-sans italic">
                    <CheckCircle2 size={11} className="text-red-500 shrink-0" />
                    <span>Active profile matches architecture successfully.</span>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
         OFFICIAL DISCUSS APK DOWNLOAD POP-UP MODAL (HIGH FIDELITY)
         ========================================================================= */}
      <AnimatePresence>
        {showAPKModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden text-white p-6 cyber-hud-card font-sans"
            >
              {/* Premium Top Strip Glowing Gradient */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-purple-500 to-blue-600" />
              
              {/* Modal Close Button */}
              <button 
                onClick={() => { if (!isDownloading) setShowAPKModal(false); }}
                disabled={isDownloading}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-all disabled:opacity-40"
                title="Close modal"
              >
                <X size={14} />
              </button>

              {/* Title & App Badge */}
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/favicon-new.png" 
                  alt="Discuss App Logo" 
                  className="w-11 h-11 rounded-xl object-cover shadow-lg bg-[#0E0E14] border border-white/5"
                />
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-white">Official Discuss App</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono font-bold text-neutral-400">
                    <span>VERSION: v2.0.0</span>
                    <span>•</span>
                    <span className="text-green-400">SECURE_SHA256</span>
                  </div>
                </div>
              </div>

              {/* Specs Grid & Ratings */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] font-mono">
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col justify-center">
                  <span className="text-neutral-500 text-[8px] uppercase">Review Grade</span>
                  <span className="text-white font-bold mt-0.5 flex items-center gap-1">
                    <Sparkles size={8} className="text-red-500 animate-pulse" /> 4.4 ★
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col justify-center">
                  <span className="text-neutral-500 text-[8px] uppercase">Downloads</span>
                  <span className="text-white font-bold mt-0.5">20+ Installs</span>
                </div>
              </div>

              {/* Scrollable Description with hidden scrollbar */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-5 max-h-[110px] overflow-y-auto scrollbar-none">
                <h4 className="text-[10px] font-mono text-red-400 mb-1.5 uppercase font-bold tracking-wider">// PLATFORM_SPECS:</h4>
                <p className="text-[11.5px] text-neutral-300 leading-relaxed font-sans font-medium">
                  Discuss is a premium developer ecosystem built to share projects, exchange innovative ideas, and build the future of tech. 
                  The official client deploys inside a sandboxed mobile workspace featuring hidden scrollbars, responsive navigation columns, optimized touch layouts, and native background notifications.
                </p>
              </div>

              {/* Downloading Progress Loader or Initiate Button */}
              <div className="space-y-3.5">
                {isDownloading ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-300">
                      <span className="flex items-center gap-1.5 animate-pulse">
                        <Cpu size={10} className="text-red-500 spin-infinite" />
                        <span>DOWNLOADING_SYS_CORE...</span>
                      </span>
                      <span className="font-bold text-red-400">{downloadProgress}%</span>
                    </div>
                    {/* Animated Loading Bar progress outline */}
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-blue-600 rounded-full transition-all"
                        style={{ width: `${downloadProgress}%`, transitionDuration: '30ms' }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={startSecureDownload}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                  >
                    <Download size={13} className="shrink-0" />
                    Download APK Package
                  </button>
                )}
                
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-neutral-500 font-mono">
                  <ShieldCheck size={10} className="text-green-500 shrink-0" />
                  <span>Verify checksum on download completion.</span>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
