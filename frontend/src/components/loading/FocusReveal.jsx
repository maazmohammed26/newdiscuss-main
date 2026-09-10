import React, { useState, useEffect, useRef } from 'react';

/**
 * FocusReveal
 * 
 * Discuss signature focus reveal motion primitive.
 * Animates newly resolved, canonical content smoothly from a gentle blur into crisp focus:
 * - STANDARD (Text, search, Content Review, chat): blur 4px -> 0, opacity 0.92 -> 1, scale 0.995 -> 1, ~220ms
 * - HERO (Profile banners, major page headers): blur 6px -> 0, opacity 0.90 -> 1, scale 0.99 -> 1, ~280ms
 * - MEDIA (Pulse video, fullscreen media, images): blur 8px -> 0, opacity 0.88 -> 1, ~300ms
 * 
 * Strict Production Rules:
 * 1. Blur is NOT loading. It is only applied to correct, resolved content coming into clarity.
 * 2. Full GPU cleanup: `will-change: filter, opacity, transform` is applied only during animation,
 *    and completely removed upon completion (filter: none, transform: none, will-change: auto) to prevent mobile/Median memory leaks.
 * 3. Does not re-animate on silent background cache revalidation or normal parent re-renders.
 * 4. Honors `prefers-reduced-motion: reduce` by rendering immediately sharp with zero blur or transform.
 * 5. Uses a stable `revealKey` (or `triggerKey`) identity. Only a new meaningful revealKey restarts animation.
 */
export default function FocusReveal({
  children,
  ready = true,
  variant = 'standard', // 'standard' | 'hero' | 'media'
  as: Component = 'div',
  className = '',
  revealKey = null, // Primary stable reveal identity key (contentHash + version / requestId)
  triggerKey = null, // Backward-compatible alias for revealKey
  onComplete,
  style = {},
  ...props
}) {
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'animating' | 'settled'
  const wasReadyRef = useRef(false);
  const activeKey = revealKey !== null && revealKey !== undefined ? revealKey : triggerKey;
  const lastKeyRef = useRef(activeKey);
  const cleanupTimerRef = useRef(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variantConfig = {
    standard: {
      blurStart: 4,
      opacityStart: 0.92,
      scaleStart: 0.995,
      duration: 220,
    },
    hero: {
      blurStart: 6,
      opacityStart: 0.90,
      scaleStart: 0.99,
      duration: 280,
    },
    media: {
      blurStart: 8,
      opacityStart: 0.88,
      scaleStart: 1.0,
      duration: 300,
    },
  };

  const config = variantConfig[variant] || variantConfig.standard;

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimState('settled');
      return;
    }

    const becameReady = ready && !wasReadyRef.current;
    const keyChanged = activeKey !== null && activeKey !== undefined && activeKey !== lastKeyRef.current;

    wasReadyRef.current = ready;
    lastKeyRef.current = activeKey;

    if (ready && (becameReady || keyChanged)) {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }

      setAnimState('animating');

      cleanupTimerRef.current = setTimeout(() => {
        setAnimState('settled');
        cleanupTimerRef.current = null;
        if (onComplete) onComplete();
      }, config.duration + 40);
    }
  }, [ready, activeKey, prefersReducedMotion, config.duration, onComplete]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  // Compute dynamic styles based on lifecycle
  let motionStyle = {};

  if (!prefersReducedMotion && animState === 'animating') {
    motionStyle = {
      animation: `discuss-focus-reveal-${variant} ${config.duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
      willChange: 'filter, opacity, transform',
    };
  } else if (animState === 'settled') {
    // Complete GPU cleanup: no permanent compositor layer
    motionStyle = {
      filter: 'none',
      transform: 'none',
      willChange: 'auto',
    };
  }

  return (
    <>
      {/* Scoped CSS animation definitions for hardware acceleration */}
      <style>{`
        @keyframes discuss-focus-reveal-standard {
          0% {
            filter: blur(4px);
            opacity: 0.92;
            transform: scale(0.995);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: scale(1.0);
          }
        }
        @keyframes discuss-focus-reveal-hero {
          0% {
            filter: blur(6px);
            opacity: 0.90;
            transform: scale(0.99);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: scale(1.0);
          }
        }
        @keyframes discuss-focus-reveal-media {
          0% {
            filter: blur(8px);
            opacity: 0.88;
            transform: scale(1.0);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: scale(1.0);
          }
        }
      `}</style>
      <Component
        className={`focus-reveal-container ${className}`}
        style={{ ...style, ...motionStyle }}
        data-focus-state={animState}
        data-testid="focus-reveal"
        {...props}
      >
        {children}
      </Component>
    </>
  );
}
