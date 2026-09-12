import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { SiGoogleplay } from 'react-icons/si';
import { useAuth } from '@/contexts/AuthContext';
import {
  getClientPlatform,
  checkDiscussInstalled,
  GOOGLE_PLAY_URL,
  ANDROID_STORE_PROMPT_SESSION_KEY,
} from '@/lib/clientPlatform';

/**
 * AndroidSmartPromotionSheet
 *
 * Appears exclusively for unauthenticated visitors on Android mobile devices.
 * Shows once per browser session via sessionStorage.
 * Restrained, native-feeling partial bottom-sheet (25-35% viewport height).
 * Direct gesture to Google Play Store listing without intermediate redirects.
 */
export default function AndroidPromotionSheet() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const primaryButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    // 1. Guard: Authenticated users should never see promotional install sheets
    if (user) return;

    // 2. Guard: Strictly Android platform only
    if (getClientPlatform() !== 'android') return;

    // 3. Guard: Show once per browser session
    try {
      if (sessionStorage.getItem(ANDROID_STORE_PROMPT_SESSION_KEY) === 'true') {
        return;
      }
    } catch {
      // In case sessionStorage is restricted (e.g. strict sandbox)
    }

    // 4. Check for installed related app if supported
    let isSubscribed = true;
    checkDiscussInstalled()
      .then((installed) => {
        if (isSubscribed && installed) {
          setIsInstalled(true);
        }
      })
      .catch(() => {});

    // 5. Present subtly after landing page has stabilized
    const timer = setTimeout(() => {
      if (isSubscribed) {
        previousFocusRef.current = document.activeElement;
        setIsOpen(true);
      }
    }, 750);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [user]);

  // Manage focus & body scroll locking when sheet opens
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus primary action after animation entry
    const focusTimer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 150);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissSheet();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  const dismissSheet = () => {
    try {
      sessionStorage.setItem(ANDROID_STORE_PROMPT_SESSION_KEY, 'true');
    } catch {
      // safe ignore
    }

    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 280);
  };

  const handleActionClick = () => {
    try {
      sessionStorage.setItem(ANDROID_STORE_PROMPT_SESSION_KEY, 'true');
    } catch {
      // safe ignore
    }
    dismissSheet();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-promo-title"
      aria-describedby="android-promo-desc"
    >
      {/* Backdrop overlay */}
      <div
        onClick={dismissSheet}
        className={`fixed inset-0 bg-neutral-950/35 backdrop-blur-[2px] transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Partial Sheet Surface */}
      <div
        className={`relative z-10 mx-auto w-full max-w-md rounded-t-2xl bg-white border-t border-neutral-200/90 shadow-2xl transition-all duration-300 ease-out transform ${
          isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Top subtle drag indicator pill */}
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="h-1 w-9 rounded-full bg-neutral-300" aria-hidden="true" />
        </div>

        <div className="px-5 pt-2 pb-2">
          {/* Header Row: Identity & Close */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-xs">
                <SiGoogleplay className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="android-promo-title"
                  className="text-base font-bold text-neutral-950 tracking-tight leading-tight"
                >
                  {isInstalled ? 'Discuss is installed' : 'Discuss for Android'}
                </h3>
                <p
                  id="android-promo-desc"
                  className="text-xs text-neutral-600 mt-0.5"
                >
                  {isInstalled
                    ? 'Launch Discuss on your device.'
                    : 'Now available on Google Play.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissSheet}
              aria-label="Close app promotion"
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Action Row */}
          <div className="mt-4 flex items-center gap-2.5">
            <a
              ref={primaryButtonRef}
              href={isInstalled ? 'https://www.discussit.in/feed' : GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleActionClick}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xs bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6]"
            >
              <SiGoogleplay className="h-4 w-4" aria-hidden="true" />
              <span>{isInstalled ? 'Open Discuss' : 'Get it on Google Play'}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={dismissSheet}
              className="inline-flex items-center justify-center rounded-xs border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
