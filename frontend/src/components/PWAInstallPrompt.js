// PWA Install Prompt Component
// Shows install prompt for first-time users on landing page
// Supports both Android and iOS with platform-specific instructions

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus, Smartphone, Monitor, Bell } from 'lucide-react';

const PROMPT_SHOWN_KEY = 'discuss_pwa_prompt_shown';
const PROMPT_DISMISSED_KEY = 'discuss_pwa_prompt_dismissed';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  
  useEffect(() => {
    const wasShown = localStorage.getItem(PROMPT_SHOWN_KEY);
    const wasDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    
    if (wasDismissed) return;
    
    const ua = navigator.userAgent;
    let detectedPlatform = 'desktop';
    
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      detectedPlatform = 'ios';
    } else if (/android/i.test(ua)) {
      detectedPlatform = 'android';
    }
    
    setPlatform(detectedPlatform);
    
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    
    if (isInstalled) return;
    
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 2000);
      localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    if (detectedPlatform === 'ios' || !wasShown) {
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
      }, 3000);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
      }
      
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  };
  
  const handleLater = () => {
    setShowPrompt(false);
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[#101010] rounded-2xl shadow-2xl border border-white/5 overflow-hidden animate-in slide-in-from-bottom duration-300 pt-1">
        {/* Top thick gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

        {/* Header */}
        <div className="relative p-6 text-white bg-gradient-to-b from-[#181818] to-[#101010]">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#DC2626]/10 rounded-xl border border-[#DC2626]/20">
              {platform === 'ios' ? (
                <Smartphone className="h-7 w-7 text-[#DC2626]" />
              ) : platform === 'android' ? (
                <Download className="h-7 w-7 text-[#2563EB]" />
              ) : (
                <Monitor className="h-7 w-7 text-[#2563EB]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Install Discuss</h3>
              <p className="text-gray-400 text-xs font-semibold">Get the ultimate zero-noise developer experience</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4 text-gray-300 font-medium">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="p-1.5 rounded-full bg-[#DC2626]/10 border border-[#DC2626]/20">
                <Bell className="h-4 w-4 text-[#DC2626]" />
              </div>
              <span>Real-time push notifications</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="p-1.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20">
                <Download className="h-4 w-4 text-[#2563EB]" />
              </div>
              <span>Works offline & loads instantly</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="p-1.5 rounded-full bg-[#DC2626]/10 border border-[#DC2626]/20">
                <Smartphone className="h-4 w-4 text-[#DC2626]" />
              </div>
              <span>Home screen access like a native app</span>
            </div>
          </div>
          
          {/* Platform-specific instructions */}
          {platform === 'ios' && (
            <div className="p-4 bg-[#181818] rounded-xl border border-white/5 space-y-3">
              <p className="font-bold text-xs sm:text-sm text-white">How to install on iOS:</p>
              <div className="space-y-2 text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#DC2626]/20 text-[#DC2626] text-[10px] font-black">1</span>
                  <span>Tap the <Share className="inline h-3.5 w-3.5 mx-1" /> Share button below</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2563EB]/20 text-[#2563EB] text-[10px] font-black">2</span>
                  <span>Scroll down and tap <Plus className="inline h-3.5 w-3.5 mx-1" /> "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#DC2626]/20 text-[#DC2626] text-[10px] font-black">3</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          )}
          
          {platform === 'android' && !deferredPrompt && (
            <div className="p-4 bg-[#181818] rounded-xl border border-white/5 space-y-3">
              <p className="font-bold text-xs sm:text-sm text-white">How to install on Android:</p>
              <div className="space-y-2 text-xs text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#DC2626]/20 text-[#DC2626] text-[10px] font-black">1</span>
                  <span>Tap the menu (⋮) in your browser</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#2563EB]/20 text-[#2563EB] text-[10px] font-black">2</span>
                  <span>Select "Add to Home screen" or "Install app"</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <Button
            variant="outline"
            onClick={handleLater}
            className="flex-1 bg-[#181818] hover:bg-[#202020] text-gray-400 hover:text-white border-white/5 rounded-xl h-11 font-bold"
          >
            Maybe Later
          </Button>
          
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] text-white hover:opacity-90 transition-opacity rounded-xl h-11 font-bold shadow-lg"
            >
              {installing ? 'Installing...' : 'Install Now'}
            </Button>
          ) : (
            <Button
              onClick={handleDismiss}
              className="flex-1 bg-gradient-to-r from-[#DC2626] to-[#2563EB] text-white hover:opacity-90 transition-opacity rounded-xl h-11 font-bold shadow-lg"
            >
              Got it!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
