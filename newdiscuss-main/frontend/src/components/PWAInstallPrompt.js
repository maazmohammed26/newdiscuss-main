// PWA Install Prompt Component
// Shows install prompt for first-time users on landing page
// Supports both Android and iOS with platform-specific instructions

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus, Smartphone, Monitor, Bell } from 'lucide-react';

// Local storage key for tracking if prompt was shown
const PROMPT_SHOWN_KEY = 'discuss_pwa_prompt_shown';
const PROMPT_DISMISSED_KEY = 'discuss_pwa_prompt_dismissed';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  
  useEffect(() => {
    // Check if already shown or dismissed
    const wasShown = localStorage.getItem(PROMPT_SHOWN_KEY);
    const wasDismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    
    if (wasDismissed) return;
    
    // Detect platform
    const ua = navigator.userAgent;
    let detectedPlatform = 'desktop';
    
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      detectedPlatform = 'ios';
    } else if (/android/i.test(ua)) {
      detectedPlatform = 'android';
    }
    
    setPlatform(detectedPlatform);
    
    // Check if already installed as PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
    
    if (isInstalled) return;
    
    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
      localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // For iOS or if no beforeinstallprompt, show manual instructions
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
  
  // Handle install click
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
  
  // Handle dismiss
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  };
  
  // Handle "Maybe Later"
  const handleLater = () => {
    setShowPrompt(false);
    // Don't set dismissed, will show again next visit
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-4 mb-4 sm:mb-0 bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              {platform === 'ios' ? (
                <Smartphone className="h-8 w-8" />
              ) : platform === 'android' ? (
                <Download className="h-8 w-8" />
              ) : (
                <Monitor className="h-8 w-8" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">Install Discuss</h3>
              <p className="text-white/80 text-sm">Get the full app experience</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span>Real-time push notifications</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Works offline & loads instantly</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span>Home screen access like a native app</span>
            </div>
          </div>
          
          {/* Platform-specific instructions */}
          {platform === 'ios' && (
            <div className="p-4 bg-muted rounded-xl space-y-3">
              <p className="font-medium text-sm">How to install on iOS:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                  <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button below</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                  <span>Scroll down and tap <Plus className="inline h-4 w-4 mx-1" /> "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          )}
          
          {platform === 'android' && !deferredPrompt && (
            <div className="p-4 bg-muted rounded-xl space-y-3">
              <p className="font-medium text-sm">How to install on Android:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                  <span>Tap the menu (⋮) in your browser</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
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
            className="flex-1"
          >
            Maybe Later
          </Button>
          
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {installing ? 'Installing...' : 'Install Now'}
            </Button>
          ) : (
            <Button
              onClick={handleDismiss}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Got it!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
