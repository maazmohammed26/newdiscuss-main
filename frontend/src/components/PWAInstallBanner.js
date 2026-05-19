import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                             window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (isIOSDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert('To install this app:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
      }
      return;
    }

    setIsInstalling(true);
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowBanner(false);
      }
    }
  }, []);

  if (isStandalone || (!showBanner && !isIOS) || (!deferredPrompt && !isIOS && showBanner === false)) {
    return null;
  }

  if (!showBanner) return null;

  return (
    <div className="relative bg-[#101010] text-[#E1E0CC] border-b border-white/5 px-4 py-3.5 relative animate-fade-in pt-4">
      {/* Top red-to-blue gradient thin border decoration */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-[#DC2626]" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-white">Install Discuss App</p>
            <p className="text-gray-400 text-xs font-semibold">
              {isIOS 
                ? 'Add to Home Screen for the ultimate zero-noise feed.' 
                : 'Get lightning fast local access and offline loading instantly.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="sm"
            className="bg-[#181818] border border-white/5 text-white hover:bg-[#202020] hover:border-[#2563EB]/40 rounded-xl font-bold transition-all shadow-inner h-9"
          >
            {isInstalling ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Installing...
              </span>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" />
                {isIOS ? 'How to Install' : 'Install Now'}
              </>
            )}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
