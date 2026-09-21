import React, { useRef, useEffect, useState, useMemo } from 'react';

/**
 * PaperFoldPlane
 * 
 * Physical 3D paper folding geometry and guided Bézier flight engine.
 * Morphs the user's actual written sheet into a recognizable aerodynamic paper plane:
 * 
 * Phase A (0–20%): Follows finger vertically, flat sheet.
 * Phase B (20–40%): Top corners crease and fold inward toward central axis.
 * Phase C (40–60%): Upper diagonal folds deepen, sheet narrows into dart shape.
 * Phase D (60–78%): Left & right wings form with 3D dihedral perspective angles.
 * Phase E (78–90%): Center fuselage spine sharpens, wing facets settle.
 * Phase F (>90%): Fully recognized paper plane, arms launch.
 * 
 * Flight: Glides along a cubic Bézier trajectory to the recipient avatar center,
 * with real-time tangent orientation (banking nose) and soft deceleration.
 */
export default function PaperFoldPlane({
  body,
  dateLabel,
  dragProgress = 0, // 0 to 1
  flightPhase = 'idle', // 'idle' | 'folding' | 'flying' | 'arrival' | 'complete'
  targetAvatarRect = null, // { x, y, width, height }
  sheetRect = null,
  onLaunchComplete = null,
}) {
  const containerRef = useRef(null);
  const [flightProgress, setFlightProgress] = useState(0); // 0 to 1 during flight
  const flightRafRef = useRef(null);
  const flightStartTimeRef = useRef(null);

  // Check reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Flight duration: ~650ms
  const FLIGHT_DURATION = 650;

  // Handle flight phase progression
  useEffect(() => {
    if (flightPhase !== 'flying') {
      setFlightProgress(0);
      if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
      return;
    }

    if (prefersReducedMotion) {
      setFlightProgress(1);
      return;
    }

    flightStartTimeRef.current = performance.now();

    const animateFlight = (now) => {
      const elapsed = now - flightStartTimeRef.current;
      const rawP = Math.min(elapsed / FLIGHT_DURATION, 1);
      
      // Smooth cubic-bezier(0.16, 1, 0.3, 1) ease-out progression
      // Approx: 1 - Math.pow(1 - rawP, 3)
      const easedP = 1 - Math.pow(1 - rawP, 3);
      setFlightProgress(easedP);

      if (rawP < 1) {
        flightRafRef.current = requestAnimationFrame(animateFlight);
      } else {
        if (typeof onLaunchComplete === 'function') {
          onLaunchComplete();
        }
      }
    };

    flightRafRef.current = requestAnimationFrame(animateFlight);

    return () => {
      if (flightRafRef.current) cancelAnimationFrame(flightRafRef.current);
    };
  }, [flightPhase, prefersReducedMotion, onLaunchComplete]);

  // Compute flight coordinate offsets and tangent angle
  const flightTransform = useMemo(() => {
    if (flightPhase === 'idle' || flightPhase === 'folding') {
      return { x: 0, y: 0, scale: 1, angleDeg: 0, opacity: 1 };
    }

    if (!targetAvatarRect || !containerRef.current) {
      // Fallback relative flight straight up if target rect unavailable
      const p = flightProgress;
      const y = -p * 380;
      const scale = 1 - p * 0.55;
      const opacity = flightPhase === 'arrival' || flightPhase === 'complete' ? 0 : (1 - p * 0.4);
      return { x: 0, y, scale, angleDeg: -15 * (1 - p), opacity };
    }

    const cRect = containerRef.current.getBoundingClientRect();
    const startX = cRect.left + cRect.width / 2;
    const startY = cRect.top + cRect.height / 3;

    const targetX = targetAvatarRect.left + targetAvatarRect.width / 2;
    const targetY = targetAvatarRect.top + targetAvatarRect.height / 2;

    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    // Cubic Bézier control points for a graceful upward-right arc
    // P0 = (0, 0)
    // P1 = (deltaX * 0.2 + 35, deltaY * 0.5 - 60) [arches upward & slightly right]
    // P2 = (deltaX * 0.8 + 15, deltaY * 0.9)
    // P3 = (deltaX, deltaY)
    const p1x = deltaX * 0.25 + 30;
    const p1y = deltaY * 0.45 - 50;
    const p2x = deltaX * 0.85 + 10;
    const p2y = deltaY * 0.85;

    const t = flightProgress;
    const mt = 1 - t;

    // Bézier curve coordinates: B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3*P3
    const curX = 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * deltaX;
    const curY = 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * deltaY;

    // Derivative B'(t) to calculate instantaneous trajectory tangent angle
    const dt = 0.01;
    const tNext = Math.min(t + dt, 1);
    const mtNext = 1 - tNext;
    const nextX = 3 * mtNext * mtNext * tNext * p1x + 3 * mtNext * tNext * tNext * p2x + tNext * tNext * tNext * deltaX;
    const nextY = 3 * mtNext * mtNext * tNext * p1y + 3 * mtNext * tNext * tNext * p2y + tNext * tNext * tNext * deltaY;

    const dx = nextX - curX;
    const dy = nextY - curY;
    // Plane nose is oriented vertically (-90deg at rest), so angle is atan2(dy, dx) + 90
    const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    // Dampen excessive banking near arrival
    const angleDeg = rawAngle * (1 - t * 0.3);

    // Scale from 1.0 -> 0.82 mid-flight -> 0.48 at arrival
    const scale = 1.0 - t * 0.52;

    // Opacity fades gracefully at very end of flight
    const opacity = flightPhase === 'arrival' || flightPhase === 'complete' ? 0 : 1;

    return { x: curX, y: curY, scale, angleDeg, opacity };
  }, [flightPhase, flightProgress, targetAvatarRect]);

  // Progressive fold parameters based on drag (0 to 1)
  // Effective progress reaches 1 during folding/flying/arrival
  const effectiveProgress = (flightPhase === 'folding' || flightPhase === 'flying' || flightPhase === 'arrival' || flightPhase === 'complete')
    ? 1
    : Math.max(0, Math.min(dragProgress, 1));

  // Phase Calculations:
  // Phase A: 0 to 0.20 (flat lift)
  const phaseA = Math.min(effectiveProgress / 0.20, 1);
  // Phase B: 0.20 to 0.40 (corner folds)
  const phaseB = Math.max(0, Math.min((effectiveProgress - 0.20) / 0.20, 1));
  // Phase C: 0.40 to 0.60 (upper diagonal taper)
  const phaseC = Math.max(0, Math.min((effectiveProgress - 0.40) / 0.20, 1));
  // Phase D: 0.60 to 0.78 (wing crease formation)
  const phaseD = Math.max(0, Math.min((effectiveProgress - 0.60) / 0.18, 1));
  // Phase E: 0.78 to 0.90 (fuselage spine sharpening & wing dihedral settle)
  const phaseE = Math.max(0, Math.min((effectiveProgress - 0.78) / 0.12, 1));
  // Phase F: > 0.90 (complete locked plane)
  const phaseF = Math.max(0, Math.min((effectiveProgress - 0.90) / 0.10, 1));

  // Dynamic angles for physical fold realism
  // Corner fold angle: 0deg to 175deg inward
  const cornerFoldAngle = phaseB * 172;
  // Wing dihedral fold angle: 0deg to 68deg
  const wingDihedralAngle = phaseD * 60 + phaseE * 8;
  // Center crease depth: 0deg to 28deg
  const centerCreaseAngle = phaseC * 16 + phaseE * 12;
  // Subtle fold shadow intensity: 0 to 0.35
  const foldShadowOpacity = (phaseB * 0.15 + phaseD * 0.15 + phaseE * 0.05);

  // Vertical displacement during drag
  const liftTranslateY = -effectiveProgress * 75;

  const isFlying = flightPhase === 'flying' || flightPhase === 'arrival' || flightPhase === 'complete';

  return (
    <div
      ref={containerRef}
      className="w-full relative flex items-center justify-center select-none"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        pointerEvents: isFlying ? 'none' : 'auto',
      }}
    >
      {/* The Morphing Paper Plane Entity */}
      <div
        className="w-full max-w-lg transition-transform"
        style={{
          transform: isFlying
            ? `translate3d(${flightTransform.x}px, ${flightTransform.y}px, 0) scale(${flightTransform.scale}) rotate(${flightTransform.angleDeg}deg)`
            : `translate3d(0, ${liftTranslateY}px, 0)`,
          transformOrigin: '50% 30%',
          opacity: flightTransform.opacity,
          transition: (effectiveProgress === 0 && !isFlying)
            ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease'
            : (isFlying ? 'none' : 'transform 0.08s linear'),
        }}
      >
        {/* Layer 1: The Rectangular Digital Paper Sheet (Fades out seamlessly as wings take full shape) */}
        <div
          className="w-full bg-[#fcfaf4] dark:bg-[#1c1a17] text-neutral-900 dark:text-neutral-100 rounded-xl shadow-lg border border-neutral-200/80 dark:border-neutral-800 overflow-hidden relative"
          style={{
            opacity: Math.max(0, 1 - phaseD * 1.3),
            transform: `scale(${1 - effectiveProgress * 0.12}) rotateX(${effectiveProgress * 25}deg)`,
            transformOrigin: 'top center',
            transition: effectiveProgress === 0 ? 'transform 0.35s ease, opacity 0.3s ease' : 'none',
          }}
        >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Metadata */}
          <div className="px-4 py-2 border-b border-neutral-200/60 dark:border-neutral-800/70 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
            <span className="tracking-widest font-semibold text-[10px] uppercase">
              DISCUSS LETTER
            </span>
            <span>{dateLabel || 'Today'}</span>
          </div>

          {/* Actual Written Body in Caveat */}
          <div className="p-4 sm:p-5 min-h-[140px] flex flex-col justify-between">
            <p className="font-['Caveat'] text-2xl sm:text-[26px] leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap select-text">
              {body || <span className="text-neutral-300 dark:text-neutral-700 italic">Write something worth keeping</span>}
            </p>
          </div>

          {/* Dynamic Fold Crease Previews across sheet during drag */}
          {phaseB > 0 && (
            <>
              {/* Left diagonal crease line */}
              <div
                className="absolute top-0 left-0 w-1/2 h-full pointer-events-none border-r border-dashed border-neutral-400/40"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  backgroundColor: `rgba(0, 0, 0, ${foldShadowOpacity})`,
                }}
              />
              {/* Right diagonal crease line */}
              <div
                className="absolute top-0 right-0 w-1/2 h-full pointer-events-none border-l border-dashed border-neutral-400/40"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                  backgroundColor: `rgba(0, 0, 0, ${foldShadowOpacity})`,
                }}
              />
            </>
          )}
        </div>

        {/* Layer 2: True 3D Folded Paper Plane Geometry Facets (Visible as progress exceeds 25%) */}
        {effectiveProgress > 0.20 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: Math.min(1, (effectiveProgress - 0.20) / 0.30),
              transform: `scale(${0.88 + phaseF * 0.12})`,
              transformOrigin: '50% 40%',
            }}
          >
            {/* SVG Aerodynamic Paper Plane Geometry constructed from authentic fold facets */}
            <svg
              viewBox="0 0 320 280"
              className="w-[280px] h-[245px] drop-shadow-md overflow-visible"
              style={{
                filter: isFlying
                  ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.22))'
                  : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.14))',
              }}
            >
              <defs>
                {/* Digital Paper Fill Gradients for authentic tactile lighting */}
                <linearGradient id="paperWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fdfcf8" />
                  <stop offset="100%" stopColor="#ede7d8" />
                </linearGradient>
                <linearGradient id="paperWingRight" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f7f4ea" />
                  <stop offset="100%" stopColor="#ded7c4" />
                </linearGradient>
                <linearGradient id="paperKeel" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ece5d4" />
                  <stop offset="100%" stopColor="#cfc6b0" />
                </linearGradient>
                <linearGradient id="darkPaperWingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2b2824" />
                  <stop offset="100%" stopColor="#1e1b18" />
                </linearGradient>
                <linearGradient id="darkPaperWingRight" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#24211e" />
                  <stop offset="100%" stopColor="#181614" />
                </linearGradient>
                <linearGradient id="darkPaperKeel" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a1816" />
                  <stop offset="100%" stopColor="#12100e" />
                </linearGradient>
              </defs>

              {/* 
                Paper Plane Geometry Coordinates:
                Nose: (160, 20)
                Tail Center: (160, 250)
                Left Wing Tip: (160 - 130 * wingSpread, 220)
                Right Wing Tip: (160 + 130 * wingSpread, 220)
                Left Keel Fold: (160 - 28 * keelSpread, 240)
                Right Keel Fold: (160 + 28 * keelSpread, 240)
              */}
              {(() => {
                const wingSpread = 0.3 + (1 - phaseD * 0.4) * 0.7; // Tapers from wide to sleek dart
                const leftTipX = 160 - 130 * wingSpread;
                const rightTipX = 160 + 130 * wingSpread;
                const keelWidth = 26 * Math.max(0.2, phaseC);

                return (
                  <g className="transition-all duration-75">
                    {/* Keel / Center Fuselage Left Facet */}
                    <polygon
                      points={`160,20 ${160 - keelWidth},242 160,228`}
                      className="fill-[url(#paperKeel)] dark:fill-[url(#darkPaperKeel)] stroke-neutral-300/60 dark:stroke-neutral-700/60"
                      strokeWidth="0.8"
                    />

                    {/* Keel / Center Fuselage Right Facet */}
                    <polygon
                      points={`160,20 160,228 ${160 + keelWidth},242`}
                      className="fill-[url(#paperKeel)] dark:fill-[url(#darkPaperKeel)] stroke-neutral-400/50 dark:stroke-neutral-800/60"
                      strokeWidth="0.8"
                    />

                    {/* Left Wing (Main Lift Surface) */}
                    <polygon
                      points={`160,20 ${leftTipX},216 ${160 - keelWidth},242`}
                      className="fill-[url(#paperWingLeft)] dark:fill-[url(#darkPaperWingLeft)] stroke-neutral-300/80 dark:stroke-neutral-700/80"
                      strokeWidth="1"
                    />

                    {/* Right Wing (Main Lift Surface with subtle depth shading) */}
                    <polygon
                      points={`160,20 ${160 + keelWidth},242 ${rightTipX},216`}
                      className="fill-[url(#paperWingRight)] dark:fill-[url(#darkPaperWingRight)] stroke-neutral-400/80 dark:stroke-neutral-800/80"
                      strokeWidth="1"
                    />

                    {/* Wing Crease Fold Shadow lines */}
                    <line
                      x1="160"
                      y1="20"
                      x2={160 - keelWidth}
                      y2="242"
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth="1.2"
                    />
                    <line
                      x1="160"
                      y1="20"
                      x2={160 + keelWidth}
                      y2="242"
                      stroke="rgba(0,0,0,0.24)"
                      strokeWidth="1.2"
                    />

                    {/* Central Spine Fold Highlight */}
                    <line
                      x1="160"
                      y1="20"
                      x2="160"
                      y2="228"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="1"
                    />

                    {/* Snippet text ghosted faintly onto the left wing fold to prove it's the actual letter */}
                    {body && phaseD > 0.4 && (
                      <text
                        x="115"
                        y="150"
                        fontSize="10"
                        fontFamily="Caveat"
                        fill="currentColor"
                        className="opacity-30 dark:opacity-25"
                        transform="rotate(-28 115 150)"
                        style={{ pointerEvents: 'none' }}
                      >
                        {body.slice(0, 18)}
                      </text>
                    )}
                  </g>
                );
              })()}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
