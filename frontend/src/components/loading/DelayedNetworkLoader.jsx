import React, { useState, useEffect, useRef } from 'react';
import DiscussLoadingDots from './DiscussLoadingDots';

/**
 * DelayedNetworkLoader
 * 
 * Adaptive delayed network loader for Discuss:
 * - Fast interactions (0-250ms) complete without rendering any loader.
 * - If request unresolved after `delay` (default ~600ms), gently fades in DiscussLoadingDots.
 * - Once visible, enforces `minVisible` (default ~220ms) to prevent jarring 1-frame flashes.
 * - Accessible with role="status" and aria-live="polite".
 * - Fully cleans up timers on unmount to prevent memory leaks in PWA/Median sessions.
 */
export default function DelayedNetworkLoader({
  active = false,
  delay = 600,
  minVisible = 220,
  size = 'sm', // 'inline' | 'sm' | 'md' | 'lg'
  mode = 'center', // 'inline' | 'center' | 'overlay' | 'section'
  label = 'Loading, please wait...',
  color,
  className = '',
  reserveSpace = false, // When true, preserves layout space while inactive
}) {
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const visibleSinceRef = useRef(null);

  useEffect(() => {
    // Clear any pending show/hide timers when active status changes
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (active) {
      if (visible) {
        // Already visible, keep visible
        return;
      }

      if (delay <= 0) {
        setVisible(true);
        visibleSinceRef.current = Date.now();
      } else {
        // Start delay timer
        showTimerRef.current = setTimeout(() => {
          setVisible(true);
          visibleSinceRef.current = Date.now();
        }, delay);
      }
    } else {
      // Transitioning to inactive
      if (!visible) {
        return;
      }

      const elapsed = Date.now() - (visibleSinceRef.current || 0);
      const remaining = minVisible - elapsed;

      if (remaining > 0) {
        // Enforce minVisible duration
        hideTimerRef.current = setTimeout(() => {
          setVisible(false);
          visibleSinceRef.current = null;
        }, remaining);
      } else {
        setVisible(false);
        visibleSinceRef.current = null;
      }
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active, delay, minVisible, visible]);

  // Clean unmount
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible && !reserveSpace) {
    return null;
  }

  const containerClasses = {
    inline: 'inline-flex items-center gap-2',
    center: 'flex items-center justify-center p-3 w-full',
    section: 'flex flex-col items-center justify-center py-6 px-4 w-full',
    overlay: 'absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-xs',
  };

  const modeClass = containerClasses[mode] || containerClasses.center;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      className={`${modeClass} ${className} transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      data-testid="delayed-network-loader"
    >
      <span className="sr-only">{label}</span>
      {visible ? (
        <DiscussLoadingDots size={size} color={color} title={label} />
      ) : null}
    </div>
  );
}
