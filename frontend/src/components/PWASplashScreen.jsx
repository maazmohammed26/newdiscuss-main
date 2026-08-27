import React, { useState, useEffect } from 'react';
import './PWASplashScreen.css';

/**
 * PWASplashScreen — High-end "Denoir" Designer Flash Screen
 * Exclusively active for installed PWA standalone mode.
 * Standard web browsing and Android native wrapper bypass this screen for instant start.
 */
export default function PWASplashScreen() {
  const [shouldRender, setShouldRender] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if in PWA standalone display mode
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
       window.matchMedia('(display-mode: fullscreen)').matches ||
       window.matchMedia('(display-mode: minimal-ui)').matches ||
       window.navigator.standalone === true);

    const isNativeCapacitor =
      typeof window !== 'undefined' &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform();

    // Check if already shown in this PWA session to keep navigation fast
    const alreadyShown = sessionStorage.getItem('discuss_pwa_splash_seen_v2');

    if (isStandalone && !isNativeCapacitor && !alreadyShown) {
      setShouldRender(true);
      sessionStorage.setItem('discuss_pwa_splash_seen_v2', 'true');

      // Schedule exit animation
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 1400);

      // Unmount component after exit transition completes
      const unmountTimer = setTimeout(() => {
        setShouldRender(false);
      }, 1850);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(unmountTimer);
      };
    }
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      className={`pwa-splash-container ${isExiting ? 'pwa-splash-exiting' : ''}`}
      aria-hidden="true"
    >
      <div className="pwa-splash-ambient-blue" />
      <div className="pwa-splash-ambient-red" />

      {/* Top spacer */}
      <div style={{ height: 20 }} />

      {/* Hero Badge */}
      <div className="pwa-splash-hero">
        <div className="pwa-splash-logo-wrapper">
          <img
            src="/logo-new.png"
            alt="Discuss 2.0"
            className="pwa-splash-logo-img"
          />
          <div className="pwa-splash-sheen" />
        </div>

        <h1 className="pwa-splash-title">
          <span className="pwa-splash-bracket-red">&lt;</span>
          <span>Discuss</span>
          <span className="pwa-splash-bracket-blue">/&gt;</span>
        </h1>

        <p className="pwa-splash-tagline">
          Discuss 2.0 · Developer Network
        </p>

        {/* Laser Neon Progress Line */}
        <div className="pwa-splash-progress-track">
          <div className="pwa-splash-progress-bar" />
        </div>
      </div>

      {/* Footer Label */}
      <div className="pwa-splash-footer">
        Engineered for Developers
      </div>
    </div>
  );
}
