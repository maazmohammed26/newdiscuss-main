import React, { useState, useEffect, useRef } from 'react';

/**
 * FocusReveal
 * 
 * Discuss signature focus reveal motion primitive.
 * Animates newly resolved, canonical content smoothly from a gentle blur into crisp focus:
 * - STANDARD: blur 4px -> 0, opacity 0.92 -> 1, ~200ms
 * - HERO: blur 6px -> 0, opacity 0.88 -> 1, scale 1.006 -> 1, ~260ms
 * - MEDIA: blur 8px -> 0, opacity 0.88 -> 1, scale 1.01 -> 1, ~300ms
 * 
 * Strict Production Rules:
 * 1. Blur is NOT loading. It is only applied to correct, resolved content coming into clarity.
 * 2. Full GPU cleanup: `will-change: filter, opacity, transform` is applied only during animation,
 *    and completely removed upon completion (filter: none, transform: none) to prevent mobile/Median memory leaks.
 * 3. Does not re-animate on silent background cache revalidation unless content materially changes.
 * 4. Honors `prefers-reduced-motion: reduce` by rendering immediately sharp with zero blur or transform.
 */
export default function FocusReveal({
  children,
  ready = true,
  variant = 'standard', // 'standard' | 'hero' | 'media'
  as: Component = 'div',
  className = '',
  triggerKey = null, // Optional key to re-trigger reveal only on meaningful content change
  onComplete,
  style = {},
  ...props
}) {
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'animating' | 'settled'
  const wasReadyRef = useRef(false);
  const lastKeyRef = useRef(triggerKey);
  const cleanupTimerRef = useRef(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variantConfig = {
    standard: {
      blurStart: 4,
      opacityStart: 0.92,
      scaleStart: 1.0,
      duration: 200,
    },
    hero: {
      blurStart: 6,
      opacityStart: 0.88,
      scaleStart: 1.006,
      duration: 260,
    },
    media: {
      blurStart: 8,
      opacityStart: 0.88,
      scaleStart: 1.01,
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
    const keyChanged = triggerKey !== null && triggerKey !== undefined && triggerKey !== lastKeyRef.current;

    wasReadyRef.current = ready;
    lastKeyRef.current = triggerKey;

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
  }, [ready, triggerKey, prefersReducedMotion, config.duration, onComplete]);

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
            transform: scale(1.0);
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
            opacity: 0.88;
            transform: scale(1.006);
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
            transform: scale(1.01);
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
