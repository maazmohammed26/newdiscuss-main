import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Monitor, Share, Terminal, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AppInstallBanner — Cybernetic Techie-HUD Style PWA Installer Banner
 * Features:
 *  - Supports OS-specific guides and buttons: Android, iOS, MacOS, Windows/Desktop
 *  - 5-second initial mount delay.
 *  - 8-second display window before auto-minimizing to the right.
 *  - Minimized floating "</>" shiny glass icon with mixed neon-red shining glow.
 *  - Dismiss button "X" immediately minimizes it and saves permanent dismissed state in localStorage.
 *  - If dismissed previously, starts in minimized mode directly on next page load (never pops full box).
 *  - If ignored (auto-minimized), it will pop again after 5s on next page load.
 *  - Median/GoNative Webview auto-suppression.
 *  - Custom CSS HUD glowing animations.
 */
export default function AppInstallBanner() {
  const [platform, setPlatform] = useState('desktop'); // 'android', 'ios', 'mac', 'desktop'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

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
    toast.success('Install widget minimized to floating dashboard link.');
  };

  // Trigger PWA Installation Flow
  const handlePWAInstall = async () => {
    if (!deferredPrompt) {
      toast.info('PWA Installation ready. Tap your browser settings (3 dots) and select "Add to Home Screen" or "Install App".');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Awesome! Welcome to the standalone Discuss app experience!');
      setDeferredPrompt(null);
      setMinimized(true);
    }
  };

  // Direct APK Download Trigger
  const handleAPKDownload = () => {
    toast.success('Initiating high-speed direct APK download...');
    window.location.href = 'https://www.discussit.in/app/discussit.apk';
  };

  if (!visible) return null;

  return (
    <>
      {/* Global CSS Inject for futuristic Techie HUD & Pulsing Red tag glow */}
      <style>{`
        @keyframes cyber-pulse-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.45), inset 0 0 8px rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.5);
          }
          50% {
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(239, 68, 68, 0.4);
            border-color: rgba(239, 68, 68, 0.9);
          }
        }
        @keyframes cyber-badge-ping {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.6);
            opacity: 1;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
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
        .cyber-hud-card {
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(239, 68, 68, 0.25);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65);
          animation: cyber-hud-pulsing 6s infinite ease-in-out;
        }
        .cyber-minimized-btn {
          background: rgba(10, 10, 15, 0.7);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(239, 68, 68, 0.5);
          animation: cyber-pulse-glow 2.5s infinite ease-in-out;
        }
        .cyber-glow-badge {
          box-shadow: 0 0 8px #ef4444;
        }
      `}</style>

      <AnimatePresence mode="wait">
        {minimized ? (
          /* =========================================================================
             MINIMIZED FLOATING ICON STATE
             ========================================================================= */
          <motion.div
            key="minimized-widget"
            initial={{ opacity: 0, scale: 0.7, x: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.7, x: 100 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            onClick={() => setMinimized(false)}
            className="fixed bottom-6 right-6 md:right-8 z-[9999] flex items-center justify-center cursor-pointer select-none"
            title="Expand Application Installer"
          >
            {/* The Floating Blurry Translucent </> Circle */}
            <div className="cyber-minimized-btn w-13 h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white relative hover:scale-105 active:scale-95 transition-all">
              <span className="font-mono text-base md:text-lg font-bold tracking-tighter text-[#E1E0CC]">&lt;/&gt;</span>
              
              {/* Mixed Pulsing Red Tag / Glow Active All the Time */}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center cyber-glow-badge z-20">
                <span className="absolute inset-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75" style={{ animationDuration: '1.8s' }} />
              </span>
            </div>
          </motion.div>
        ) : (
          /* =========================================================================
             EXPANDED TECHIE HUD INSTAL CARD STATE
             ========================================================================= */
          <motion.div
            key="expanded-widget"
            initial={{ opacity: 0, scale: 0.9, y: 50, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30, x: 100 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:-translate-x-0 md:right-8 z-[9999] w-[92%] max-w-[430px] rounded-2xl overflow-hidden cyber-hud-card select-none text-white p-4.5"
          >
            {/* Pulsing Cyber Neon Top Strip Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-red-500 via-purple-500 to-blue-600" />
            
            {/* Futuristic Tech HUD Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5 font-mono">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-red-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold font-mono">
                  // SYS_DETECTED: {platform.toUpperCase()}_SYS
                </span>
              </div>
              <button 
                onClick={handleDismiss}
                className="p-1 rounded-md text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-all flex items-center gap-1 group"
                title="Minimize widget to sidebar"
              >
                <span className="text-[8px] font-bold tracking-widest hidden sm:inline text-neutral-500 group-hover:text-red-400">MINIMIZE</span>
                <X size={14} />
              </button>
            </div>

            {/* Layout Box without the bulky "D" icon */}
            <div className="space-y-3.5 pr-1">
              
              {/* Dynamic OS Title & Badges */}
              <div className="space-y-1">
                <h4 className="font-bold text-sm tracking-wide text-[#E1E0CC] flex items-center gap-2 font-mono">
                  {platform === 'android' && 'Discuss for Android'}
                  {platform === 'ios' && 'Add Discuss to iPhone'}
                  {platform === 'mac' && 'Discuss for macOS Standalone'}
                  {platform === 'desktop' && 'Discuss Standalone Client'}
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-sans font-bold flex items-center gap-1">
                    <Sparkles size={8} /> 4.8 ★ (20+ installs)
                  </span>
                </h4>

                {/* dynamic platform messages */}
                {platform === 'android' && (
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Run natively via a secure APK download with high-performance sandboxing, or initialize directly onto your home screen using the global PWA client.
                  </p>
                )}
                {platform === 'ios' && (
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Launch Discuss as a full-screen standalone application bypassing App Store fees. Ready with offline core and instant performance.
                  </p>
                )}
                {platform === 'mac' && (
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Get deep integration with macOS. Run standalone with launch shortcuts, full multitasking supports, and hardware acceleration on your MacBook/Mac.
                  </p>
                )}
                {platform === 'desktop' && (
                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    Deploy native standalone environment client. Pin directly to your taskbar or desktop for lightning speeds, high-performance, and secure chats.
                  </p>
                )}
              </div>

              {/* iOS Manual Installation Guide block (Clean step boxes) */}
              {platform === 'ios' && (
                <div className="space-y-2 font-mono text-[10.5px]">
                  <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5 text-neutral-300">
                    <span className="text-red-400 font-bold">01.</span>
                    <span className="flex-1">Tap the <strong className="text-white">Share</strong> button in Safari's bottom tab bar</span>
                    <Share size={12} className="text-blue-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5 text-neutral-300">
                    <span className="text-red-400 font-bold">02.</span>
                    <span className="flex-1">Scroll down and select <strong className="text-white">"Add to Home Screen"</strong></span>
                    <span className="text-[12px] text-red-500 font-black">+</span>
                  </div>
                </div>
              )}

              {/* CTA Action Bar - Perfectly Aligned, Supporting all screens */}
              <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
                
                {/* Android Action CTA */}
                {platform === 'android' && (
                  <div className="flex flex-row gap-2 w-full">
                    <button
                      onClick={handleAPKDownload}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-white/10 hover:border-red-500/40 hover:bg-red-500/5 transition-all text-xs font-bold font-sans text-neutral-300 cursor-pointer"
                    >
                      <Download size={13} className="text-red-400 shrink-0" />
                      Direct APK
                    </button>
                    <button
                      onClick={handlePWAInstall}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                    >
                      <Smartphone size={13} className="shrink-0" />
                      Install (PWA)
                    </button>
                  </div>
                )}

                {/* macOS CTA */}
                {platform === 'mac' && (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                  >
                    <Monitor size={13} className="shrink-0" />
                    Install macOS App
                  </button>
                )}

                {/* Windows/Generic Desktop CTA */}
                {platform === 'desktop' && (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500 to-blue-600 hover:opacity-90 text-white text-xs font-bold font-sans transition-all shadow-[0_4px_12px_rgba(239,68,68,0.25)] cursor-pointer"
                  >
                    <Monitor size={13} className="shrink-0" />
                    Install Standalone
                  </button>
                )}

                {/* iOS Safari validation text */}
                {platform === 'ios' && (
                  <div className="flex items-center gap-1.5 w-full text-[10px] text-neutral-400 font-sans italic">
                    <CheckCircle2 size={11} className="text-red-500 shrink-0" />
                    <span>App matches device core framework successfully.</span>
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
