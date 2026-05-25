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
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                             window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      // Show our custom banner
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS banner after a delay if on iOS and not installed
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

  // Listen for successful install
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
      // For iOS, show instructions
      if (isIOS) {
        alert('To install this app:\n\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
      }
      return;
    }

    setIsInstalling(true);
    
    try {
      // Show the install prompt immediately
      deferredPrompt.prompt();
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowBanner(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = () => {
    setShowBanner(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  // Check if banner was recently dismissed
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa_banner_dismissed');
    if (dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowBanner(false);
      }
    }
  }, []);

  // Don't show if already installed or no prompt available (and not iOS)
  if (isStandalone || (!showBanner && !isIOS) || (!deferredPrompt && !isIOS && showBanner === false)) {
    return null;
  }

  if (!showBanner) return null;

  return (
    <div className="bg-[#2563EB] discuss:bg-[#EF4444] text-white px-4 py-3 relative animate-fade-in">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Install Discuss App</p>
            <p className="text-white/80 text-xs">
              {isIOS 
                ? 'Add to Home Screen for the best experience' 
                : 'Get faster access and offline support'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="sm"
            className="bg-white text-[#2563EB] discuss:text-[#EF4444] hover:bg-white/90 rounded-[6px] shadow-button font-semibold"
          >
            {isInstalling ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
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
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
