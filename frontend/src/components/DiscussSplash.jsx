import React, { useEffect, useState } from 'react';
import { VECTOR_GLYPHS, WORDMARK_VIEWBOX } from './DiscussGlyphs';
import './DiscussSplash.css';

/**
 * DiscussSplash — Lovable Animated Splash Screen for Discuss PWA / Web
 *
 * Vector-perfect rendering using exact closed bezier paths from Caveat Bold & Space Grotesk.
 * Eliminates all font rasterization artifacts, scaling distortion, and stroke clipping on mobile/PWA.
 *
 * Exclusively for PWA/Web. Android native Capacitor wrapper bypasses this.
 * Theme is strictly synced with user's saved choice (localStorage discuss_theme)
 * with graceful fallback to system preference.
 */

const STAGGER = 95;
const POP_MS = 520;
const HOLD_MS = 600;
const OUT_MS = 450;

export const SPLASH_TOTAL_MS =
  (VECTOR_GLYPHS.length - 1) * STAGGER + POP_MS + HOLD_MS + OUT_MS;

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  try {
    if (
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    ) {
      return true;
    }
  } catch (e) {}
  return false;
};

const getEffectiveTheme = () => {
  try {
    const saved = localStorage.getItem('discuss_theme');
    if (saved === 'dark' || saved === 'discuss-black') return 'dark';
    if (saved === 'light' || saved === 'discuss-light' || saved === 'discuss-retro') return 'light';
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  } catch (e) {
    return 'light';
  }
};

export default function DiscussSplash({ onFinish, runKey = 0 }) {
  const [shouldRender, setShouldRender] = useState(() => !isNativePlatform());
  const [leaving, setLeaving] = useState(false);
  const [theme] = useState(getEffectiveTheme);

  useEffect(() => {
    if (isNativePlatform()) {
      setShouldRender(false);
      return;
    }

    setLeaving(false);
    const outAt = (VECTOR_GLYPHS.length - 1) * STAGGER + POP_MS + HOLD_MS;
    const t1 = window.setTimeout(() => setLeaving(true), outAt);
    const t2 = window.setTimeout(() => {
      setShouldRender(false);
      if (typeof onFinish === 'function') {
        onFinish();
      }
    }, outAt + OUT_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [runKey, onFinish]);

  if (!shouldRender) return null;

  return (
    <div
      className={`splash-root splash-theme-${theme} ${leaving ? 'splash-leaving' : ''}`}
      data-theme={theme}
      aria-label="Discuss"
      role="img"
    >
      <div className="splash-wordmark-container">
        <svg
          className="splash-wordmark-svg"
          viewBox={WORDMARK_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {VECTOR_GLYPHS.map((g, i) => (
            <g
              key={`${g.ch}-${i}`}
              className={`splash-char splash-${g.kind}`}
              style={{
                animationDelay: `${i * STAGGER}ms`,
                transformOrigin: `${g.originX}px ${g.originY}px`,
              }}
            >
              <path d={g.d} fill="currentColor" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export { DiscussSplash };
