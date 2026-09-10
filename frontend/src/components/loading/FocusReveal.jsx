import React, { useState, useEffect, useRef } from 'react';

/**
 * FocusReveal
 * 
 * Discuss signature focus reveal motion primitive.
 * Animates newly resolved, canonical content smoothly from a gentle blur into crisp focus:
 * - STANDARD (Text, search, Content Review, chat): blur 6px -> 0, opacity 0.90 -> 1, scale 0.993 -> 1, ~250ms
 * - HERO (Profile banners, major page headers): blur 8.5px -> 0, opacity 0.88 -> 1, scale 0.985 -> 1, ~310ms
 * - MEDIA (Pulse video, fullscreen media, images): blur 11px -> 0, opacity 0.86 -> 1, scale 1.005 -> 1, ~340ms
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
      blurStart: 6,
      opacityStart: 0.90,
      scaleStart: 0.993,
      duration: 250,
    },
    hero: {
      blurStart: 8.5,
      opacityStart: 0.88,
      scaleStart: 0.985,
      duration: 310,
    },
    media: {
      blurStart: 11,
      opacityStart: 0.86,
      scaleStart: 1.005,
      duration: 340,
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
      }, config.duration + 25);
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
            filter: blur(6px);
            opacity: 0.90;
            transform: scale(0.993);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: scale(1.0);
          }
        }
        @keyframes discuss-focus-reveal-hero {
          0% {
            filter: blur(8.5px);
            opacity: 0.88;
            transform: scale(0.985);
          }
          100% {
            filter: blur(0px);
            opacity: 1;
            transform: scale(1.0);
          }
        }
        @keyframes discuss-focus-reveal-media {
          0% {
            filter: blur(11px);
            opacity: 0.86;
            transform: scale(1.005);
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
