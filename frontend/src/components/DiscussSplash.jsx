import React, { useEffect, useState } from 'react';
import './DiscussSplash.css';

/**
 * DiscussSplash — Lovable Animated Splash Screen for Discuss PWA / Web
 *
 * Source of truth: Lovable implementation (Discuss Animation Studio)
 * Characters build sequentially with spring pop effect:
 *   < in Discuss brand red
 *   Discuss in handwritten Caveat typography
 *   /> in Discuss brand blue
 *
 * Exclusively for PWA/Web. Android native Capacitor wrapper bypasses this.
 * Theme is strictly synced with user's saved choice (localStorage discuss_theme)
 * with graceful fallback to system preference.
 */

const CHARS = [
  { ch: '<', kind: 'bracket-red' },
  { ch: 'D', kind: 'script' },
  { ch: 'i', kind: 'script' },
  { ch: 's', kind: 'script' },
  { ch: 'c', kind: 'script' },
  { ch: 'u', kind: 'script' },
  { ch: 's', kind: 'script' },
  { ch: 's', kind: 'script' },
  { ch: '/', kind: 'bracket-blue' },
  { ch: '>', kind: 'bracket-blue' },
];

const STAGGER = 95;
const POP_MS = 520;
const HOLD_MS = 600;
const OUT_MS = 450;

export const SPLASH_TOTAL_MS =
  (CHARS.length - 1) * STAGGER + POP_MS + HOLD_MS + OUT_MS;

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
    const outAt = (CHARS.length - 1) * STAGGER + POP_MS + HOLD_MS;
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
      <div className="splash-wordmark">
        {CHARS.map((c, i) => (
          <span
            key={`${c.ch}-${i}`}
            className={`splash-char splash-${c.kind}`}
            style={{ animationDelay: `${i * STAGGER}ms` }}
          >
            {c.ch}
          </span>
        ))}
      </div>
    </div>
  );
}

export { DiscussSplash };
