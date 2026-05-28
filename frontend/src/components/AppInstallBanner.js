import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor, Share, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AppInstallBanner — Dynamic platform-aware install banner
 * Supports:
 *  - Android: Shows direct APK download + Native PWA install (with guidelines)
 *  - iOS: Shows Safari Share Sheet step-by-step instructions
 *  - Desktop: Shows native standalone PWA desktop app install prompt
 *  - Native App detection: Hides completely inside Median/GoNative webviews
 *  - Dismiss persistence: X saves close timestamp for 14 days
 */
export default function AppInstallBanner() {
  const [platform, setPlatform] = useState('desktop'); // 'android', 'ios', 'desktop'
  const [isSafari, setIsSafari] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Hide banner if already loaded inside the Median wrapped WebView app
    const isMedianApp = typeof window !== 'undefined' && (
      window.median !== undefined ||
      window.gonative !== undefined ||
      navigator.userAgent.includes('Median') ||
      navigator.userAgent.includes('GoNative')
    );
    if (isMedianApp) return;

    // 2. Hide if dismissed recently (within 14 days)
    const dismissKey = 'discuss_install_banner_dismissed';
    const lastDismissed = localStorage.getItem(dismissKey);
    if (lastDismissed) {
      const parsedTime = parseInt(lastDismissed, 10);
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < fourteenDaysMs) {
        return; // Still in dismiss cooldown
      }
    }

    // 3. Platform & browser detection
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);
    const safariCheck = /^((?!chrome|android).)*safari/i.test(ua);

    if (isIOS) {
      setPlatform('ios');
      setIsSafari(safariCheck);
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // 4. Delay showing for premium presentation
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // 5. Catch standard beforeinstallprompt event for PWA installs
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

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('discuss_install_banner_dismissed', Date.now().toString());
  };

  const handleNativePWAInstall = async () => {
    if (!deferredPrompt) {
      // Fallback instructions if native prompt isn't fired yet
      toast.info('To install: Tap your browser settings menu (3 dots) and select "Add to Home Screen" or "Install App".');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Thank you for installing Discuss!');
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  const handleAPKDownload = () => {
    toast.success('Starting download of Discuss APK...');
    // Point to download endpoint or placeholder
    window.location.href = 'https://www.discussit.in/app/discussit.apk';
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-lg animate-in slide-in-from-bottom duration-500">
      <div 
        className="relative bg-neutral-900/90 dark:bg-black/90 discuss-black:bg-[#0D0D12]/95 border border-[#2563EB]/25 discuss:border-[#EF4444]/25 discuss-black:border-[#FF007F]/25 backdrop-blur-md rounded-2xl p-4.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center gap-4 text-white overflow-hidden select-none"
        style={document.documentElement.classList.contains('discuss-black')
          ? { borderColor: 'rgba(255, 0, 127, 0.25)', boxShadow: '0 8px 32px rgba(255, 0, 127, 0.1)' }
          : {}}
      >
        <div className="bg-noise absolute inset-0 opacity-[0.06] pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-all z-20"
        >
          <X size={15} />
        </button>

        {/* App Icon / Graphic */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#DC2626] discuss:from-[#EF4444] discuss:to-[#2563EB] discuss-black:from-[#FF007F] discuss-black:to-[#2563EB] flex items-center justify-center shadow-lg">
          <span className="font-extrabold text-lg tracking-tighter text-white font-mono">D</span>
        </div>

        {/* Dynamic Content based on Platform */}
        <div className="flex-1 text-center md:text-left min-w-0 pr-2">
          <h4 className="font-bold text-sm text-[#E1E0CC] flex items-center justify-center md:justify-start gap-1.5">
            {platform === 'desktop' && 'Install Discuss Standalone'}
            {platform === 'android' && 'Discuss for Android'}
            {platform === 'ios' && 'Add Discuss to iPhone'}
            <CheckCircle2 size={13} className="text-[#2563EB] discuss:text-[#EF4444] discuss-black:text-[#FF007F] shrink-0" />
          </h4>

          {/* Prompt Messages */}
          {platform === 'desktop' && (
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              Get direct access from your taskbar or desktop with our lightning-fast standalone app.
            </p>
          )}

          {platform === 'android' && (
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              Download our direct APK or install the secure PWA directly to your home screen.
            </p>
          )}

          {platform === 'ios' && (
            <div className="text-xs text-neutral-400 mt-1 leading-relaxed space-y-1 text-left">
              <p>Install our premium app directly without App Store fees:</p>
              <div className="flex items-center gap-1.5 mt-1 bg-white/5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/5">
                <span>1. Tap the Share button</span>
                <Share size={12} className="text-[#2563EB] discuss:text-[#EF4444]" />
                <span>at the bottom</span>
              </div>
              <p className="pl-1 mt-0.5 text-[11px]">2. Scroll down and select <span className="text-[#E1E0CC] font-bold">"Add to Home Screen"</span>.</p>
            </div>
          )}
        </div>

        {/* OS Specific CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0 z-10">
          {platform === 'desktop' && (
            <button 
              onClick={handleNativePWAInstall}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#DC2626] discuss:from-[#EF4444] discuss:to-[#2563EB] discuss-black:from-[#FF007F] discuss-black:to-[#2563EB] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md w-full md:w-auto"
            >
              <Monitor size={14} />
              Install Standalone
            </button>
          )}

          {platform === 'android' && (
            <>
              <button 
                onClick={handleAPKDownload}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all border border-white/10 w-full sm:flex-1 md:w-auto"
              >
                <Download size={14} className="text-[#2563EB] discuss:text-[#EF4444] discuss-black:text-[#FF007F]" />
                Direct APK
              </button>
              <button 
                onClick={handleNativePWAInstall}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#2563EB] to-[#DC2626] discuss:from-[#EF4444] discuss:to-[#2563EB] discuss-black:from-[#FF007F] discuss-black:to-[#2563EB] hover:opacity-95 text-white text-xs font-bold rounded-xl transition-all shadow-md w-full sm:flex-1 md:w-auto"
              >
                <Smartphone size={14} />
                Install App (PWA)
              </button>
            </>
          )}

          {platform === 'ios' && !isSafari && (
            <p className="text-[10px] text-neutral-500 italic max-w-[150px] text-center md:text-right font-medium leading-normal mt-1 md:mt-0">
              *Please open this website in Safari browser to install.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
