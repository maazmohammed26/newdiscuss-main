import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Discuss Drawable UI Primitives
 * Deterministic, vector-stable hand-drawn borders & interactive controls.
 * - Zero random generation (guaranteed zero layout shift / rerender jitter)
 * - Semantic, accessible HTML controls (button, input, link)
 * - Discuss Palette: Pure White (#FFFFFF), Charcoal (#0A0A0A), Red (#EF4444), Blue (#0095F6)
 */

// ── 1. DETERMINISTIC DRAWABLE FRAMES & BOXES ─────────────────────────────────

/**
 * Predefined SVG border paths for box frames (normalized to 500x300 viewBox)
 * Each variant has fixed, handcrafted bezier control points with natural imperfections,
 * subtle corner overshoots, and organic line variations.
 */
const FRAME_VARIANTS = {
  // Variant A: Subtle charcoal pen - single organic line with slight corner overshoots
  'charcoal-pen': {
    viewBox: '0 0 500 300',
    path: 'M 8,10 C 130,7 280,12 492,8 C 495,70 491,180 493,292 C 360,295 190,291 7,294 C 5,210 9,100 8,10 Z',
    accentPath: 'M 4,14 L 14,4 M 486,296 L 496,286',
    stroke: '#1F2937',
    strokeWidth: '1.8',
    opacity: '0.85',
  },
  // Variant B: Double red marker - expressive hand-drawn double stroke
  'red-double-marker': {
    viewBox: '0 0 500 300',
    path: 'M 9,11 C 125,8 300,13 490,9 C 494,80 489,190 492,291 C 370,294 180,289 8,293 C 6,200 11,95 9,11 Z',
    secondPath: 'M 14,16 C 140,13 310,17 485,14 C 489,85 484,185 487,286 C 365,289 185,284 13,288 C 11,195 16,100 14,16 Z',
    stroke: '#EF4444',
    strokeWidth: '2.2',
    secondStrokeWidth: '1.4',
    opacity: '0.9',
  },
  // Variant C: Blue technical sketch - architectural lines with corner cross-ticks
  'blue-tech': {
    viewBox: '0 0 500 300',
    path: 'M 10,12 C 140,10 320,13 488,11 C 491,90 488,195 490,288 C 350,290 160,287 10,289 C 8,205 11,95 10,12 Z',
    cornerTicks: [
      'M 2,12 L 24,12 M 10,4 L 10,26', // Top-left cross
      'M 476,11 L 498,11 M 488,3 L 488,25', // Top-right cross
      'M 478,288 L 500,288 M 490,276 L 490,298', // Bottom-right cross
      'M 2,289 L 24,289 M 10,277 L 10,299', // Bottom-left cross
    ],
    stroke: '#0095F6',
    strokeWidth: '1.9',
    opacity: '0.85',
  },
  // Variant D: Rough charcoal sketch - inked look with organic contour
  'charcoal-rough': {
    viewBox: '0 0 500 300',
    path: 'M 7,9 C 110,6 260,11 493,8 C 497,75 492,185 494,291 C 375,294 175,290 6,293 C 4,195 9,90 7,9 Z',
    secondPath: 'M 11,12 C 135,10 280,14 489,12 C 492,78 488,180 490,287 C 360,289 170,286 10,289 C 8,190 12,94 11,12 Z',
    stroke: '#111827',
    strokeWidth: '1.9',
    secondStrokeWidth: '1.1',
    opacity: '0.8',
  },
};

export function DrawableFrame({
  children,
  variant = 'charcoal-pen', // 'charcoal-pen' | 'red-double-marker' | 'blue-tech' | 'charcoal-rough'
  className = '',
  highlight = false,
  highlightColor = 'red',
  role,
  ariaLabel,
}) {
  const config = FRAME_VARIANTS[variant] || FRAME_VARIANTS['charcoal-pen'];
  const strokeColor = highlight
    ? highlightColor === 'blue'
      ? '#0095F6'
      : '#EF4444'
    : config.stroke;

  return (
    <div
      className={`relative drawable-frame ${highlight ? 'drawable-frame-highlight' : ''} ${className}`}
      role={ariaLabel ? role || 'region' : undefined}
      aria-label={ariaLabel}
    >
      <svg
        viewBox={config.viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Main outer stroke */}
        <path
          d={config.path}
          stroke={strokeColor}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={config.opacity}
          vectorEffect="non-scaling-stroke"
          className="drawable-stroke-main"
        />

        {/* Second stroke for double marker/rough styles */}
        {config.secondPath && (
          <path
            d={config.secondPath}
            stroke={strokeColor}
            strokeWidth={config.secondStrokeWidth || '1.2'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={highlight ? '0.6' : '0.45'}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Corner ticks for technical sketch */}
        {config.cornerTicks &&
          config.cornerTicks.map((tickPath, idx) => (
            <path
              key={idx}
              d={tickPath}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.75"
              vectorEffect="non-scaling-stroke"
            />
          ))}

        {/* Accent marks */}
        {config.accentPath && (
          <path
            d={config.accentPath}
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── 2. DRAWABLE BUTTON SYSTEM ────────────────────────────────────────────────

export function DrawableButton({
  children,
  to,
  onClick,
  variant = 'red-marker', // 'red-marker' | 'red-outline' | 'blue-outline' | 'charcoal-outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  ariaLabel,
  type = 'button',
  disabled = false,
}) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs font-semibold min-h-[38px]',
    md: 'px-6 py-3 text-sm font-bold min-h-[44px]',
    lg: 'px-8 py-3.5 text-base font-bold min-h-[48px]',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  const content = (
    <span className="relative z-10 flex items-center justify-center gap-2 select-none">
      {children}
    </span>
  );

  const sharedProps = {
    className: `drawable-btn drawable-btn-${variant} ${currentSizeClass} ${className} ${
      disabled ? 'opacity-60 cursor-not-allowed' : ''
    }`,
    'aria-label': ariaLabel,
  };

  // Fixed SVG paths for button outlines
  const buttonSvg = (
    <svg
      viewBox="0 0 200 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Primary perimeter */}
      <path
        d="M 6,7 C 55,4 145,6 193,5 C 196,18 194,36 193,46 C 145,48 55,46 6,47 C 4,35 6,18 6,7 Z"
        className="drawable-btn-path-outer"
        vectorEffect="non-scaling-stroke"
      />
      {/* Subtle organic secondary contour */}
      <path
        d="M 9,10 C 60,8 140,9 190,8 C 193,20 191,33 190,43 C 140,44 60,43 9,44 C 7,33 9,20 9,10 Z"
        className="drawable-btn-path-inner"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );

  if (to && !disabled) {
    return (
      <Link to={to} {...sharedProps}>
        {content}
        {buttonSvg}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} {...sharedProps}>
      {content}
      {buttonSvg}
    </button>
  );
}

// ── 3. DRAWABLE INPUT FIELD ──────────────────────────────────────────────────

export function DrawableInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  disabled = false,
  required = false,
  autoComplete,
  inputMode,
  icon: Icon,
  className = '',
  ariaDescribedBy,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative drawable-input-wrapper flex items-center ${
        isFocused ? 'is-focused' : ''
      } ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      {/* Hand-drawn SVG border */}
      <svg
        viewBox="0 0 400 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 5,6 C 110,4 290,5 394,4 C 397,18 395,32 395,43 C 285,45 105,44 5,44 C 3,32 5,18 5,6 Z"
          stroke={isFocused ? '#0095F6' : '#9CA3AF'}
          strokeWidth={isFocused ? '2.2' : '1.6'}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-input-stroke"
        />
        {isFocused && (
          <path
            d="M 8,9 C 115,7 285,8 391,7 C 393,19 392,30 392,40 C 280,41 110,41 8,41 C 6,30 8,19 8,9 Z"
            stroke="#0095F6"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="drawable-input-focus-accent"
          />
        )}
      </svg>

      {/* Leading Icon if provided */}
      {Icon && (
        <div className="absolute left-3.5 pointer-events-none text-neutral-400 z-10">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      {/* Accessible semantic HTML input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-describedby={ariaDescribedBy}
        className={`w-full h-11 bg-transparent text-sm font-medium text-neutral-950 placeholder-neutral-400 outline-none z-10 ${
          Icon ? 'pl-10 pr-3' : 'px-3'
        }`}
      />
    </div>
  );
}

// ── 4. DRAWABLE TAG BADGE ───────────────────────────────────────────────────

export function DrawableTag({ children, color = 'charcoal', className = '' }) {
  const strokeColor =
    color === 'red' ? '#EF4444' : color === 'blue' ? '#0095F6' : '#374151';
  const textColor =
    color === 'red'
      ? 'text-[#EF4444]'
      : color === 'blue'
      ? 'text-[#0095F6]'
      : 'text-neutral-800';
  const bgColor =
    color === 'red'
      ? 'bg-[#EF4444]/5'
      : color === 'blue'
      ? 'bg-[#0095F6]/5'
      : 'bg-neutral-50';

  return (
    <span
      className={`relative inline-flex items-center px-2.5 py-1 font-mono text-xs font-semibold ${textColor} ${bgColor} ${className}`}
    >
      <svg
        viewBox="0 0 100 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 4,4 C 30,2 70,3 96,3 C 98,12 97,22 96,28 C 70,30 30,29 4,28 C 2,20 3,10 4,4 Z"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative z-10">{children}</span>
    </span>
  );
}

// ── 5. DRAWABLE DIVIDER ─────────────────────────────────────────────────────

export function DrawableDivider({ className = '', color = 'neutral' }) {
  const strokeColor =
    color === 'red' ? '#EF4444' : color === 'blue' ? '#0095F6' : '#1F2937';
  const opacity = color === 'neutral' ? '0.2' : '0.8';

  return (
    <div className={`drawable-divider-wrap ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-3 overflow-visible"
        preserveAspectRatio="none"
      >
        <path
          d="M 2,8 C 190,5 370,11 600,7 C 820,3 1010,10 1198,8"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity={opacity}
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-line"
        />
      </svg>
    </div>
  );
}

// ── 6. DRAWABLE UNDERLINES ──────────────────────────────────────────────────

export function DrawableUnderline({ children, color = 'red', className = '' }) {
  const strokeColor =
    color === 'blue' ? '#0095F6' : color === 'red' ? '#EF4444' : '#111827';

  return (
    <span className={`relative inline-block ${className}`}>
      <span>{children}</span>
      <svg
        viewBox="0 0 200 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-1.5 left-0 w-full h-[9px] overflow-visible pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 3,8 C 45,4 95,11 140,6 C 168,3 188,9 197,7"
          stroke={strokeColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-path"
        />
      </svg>
    </span>
  );
}

export function DrawableDoubleUnderline({ children, color = 'red', className = '' }) {
  const strokeColor = color === 'blue' ? '#0095F6' : '#EF4444';

  return (
    <span className={`relative inline-block ${className}`}>
      <span>{children}</span>
      <svg
        viewBox="0 0 240 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-2.5 left-0 w-full h-[14px] overflow-visible pointer-events-none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 2,7 C 55,4 130,9 238,5"
          stroke={strokeColor}
          strokeWidth="3.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-path"
        />
        <path
          d="M 8,13 C 60,15 150,11 230,14"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeOpacity="0.75"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-path"
        />
      </svg>
    </span>
  );
}

// ── 7. DRAWABLE CIRCLE / OVAL ───────────────────────────────────────────────

export function DrawableCircle({ children, color = 'red', className = '' }) {
  const strokeColor =
    color === 'blue' ? '#0095F6' : color === 'red' ? '#EF4444' : '#111827';

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span className="relative z-10 px-1.5 py-0.5">{children}</span>
      <svg
        viewBox="0 0 100 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full -top-1 -left-1 scale-110 pointer-events-none overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 15,24 C 14,10 32,5 56,5 C 82,5 95,14 94,26 C 93,38 74,44 48,43 C 24,42 6,36 10,21 C 12,13 28,7 46,6"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-path"
        />
      </svg>
    </span>
  );
}

// ── 8. DRAWABLE ARROW ───────────────────────────────────────────────────────

export function DrawableArrow({
  direction = 'down-right', // 'down-right' | 'down-left' | 'right' | 'curved-accent'
  label = '',
  color = 'blue', // 'red' | 'blue' | 'neutral'
  className = '',
  labelPlacement = 'top',
}) {
  const strokeColor =
    color === 'red' ? '#EF4444' : color === 'blue' ? '#0095F6' : '#111827';
  const textColor =
    color === 'red'
      ? 'text-[#EF4444]'
      : color === 'blue'
      ? 'text-[#0095F6]'
      : 'text-neutral-800';

  let pathData = 'M 4,4 C 20,4 34,14 42,28 M 32,26 L 43,30 L 44,18';
  let viewBox = '0 0 52 36';
  let width = 52;
  let height = 36;

  if (direction === 'down-left') {
    pathData = 'M 46,4 C 30,4 16,14 8,28 M 18,26 L 7,30 L 6,18';
    viewBox = '0 0 52 36';
  } else if (direction === 'right') {
    pathData = 'M 4,14 C 25,12 45,15 62,14 M 52,7 L 64,14 L 52,21';
    viewBox = '0 0 68 28';
    width = 68;
    height = 28;
  } else if (direction === 'curved-accent') {
    pathData = 'M 6,32 C 16,12 36,6 58,16 M 48,10 L 60,17 L 55,27';
    viewBox = '0 0 66 38';
    width = 66;
    height = 38;
  }

  return (
    <div
      className={`inline-flex flex-col items-center select-none ${className}`}
      aria-hidden="true"
    >
      {label && labelPlacement === 'top' && (
        <span className={`drawable-handwritten text-sm leading-none mb-1 ${textColor}`}>
          {label}
        </span>
      )}
      <svg
        width={width}
        height={height}
        viewBox={viewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <path
          d={pathData}
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-path"
        />
      </svg>
      {label && labelPlacement === 'bottom' && (
        <span className={`drawable-handwritten text-sm leading-none mt-1 ${textColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── 9. DRAWABLE CONNECTOR ───────────────────────────────────────────────────

export function DrawableConnector({
  direction = 'horizontal', // 'horizontal' | 'vertical'
  color = 'red', // 'red' | 'blue' | 'neutral'
  dashed = true,
  className = '',
  label = '',
}) {
  const strokeColor =
    color === 'red' ? '#EF4444' : color === 'blue' ? '#0095F6' : '#111827';
  const textColor =
    color === 'red'
      ? 'text-[#EF4444]'
      : color === 'blue'
      ? 'text-[#0095F6]'
      : 'text-neutral-800';

  if (direction === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`} aria-hidden="true">
        {label && (
          <span className={`drawable-handwritten text-xs font-bold mb-1 ${textColor}`}>
            {label}
          </span>
        )}
        <svg width="24" height="48" viewBox="0 0 24 48" fill="none" className="overflow-visible">
          <path
            d="M 12,2 C 8,14 16,30 12,46 M 5,38 L 12,46 L 19,38"
            stroke={strokeColor}
            strokeWidth="2"
            strokeDasharray={dashed ? '4 3' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} aria-hidden="true">
      <svg width="64" height="16" viewBox="0 0 64 16" fill="none" className="overflow-visible">
        <path
          d="M 2,8 C 20,4 44,12 62,8"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 3' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="drawable-draw-line"
        />
      </svg>
      {label && (
        <span className={`font-mono text-[9px] font-bold uppercase tracking-wider mt-1 ${textColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── 10. HANDWRITTEN ANNOTATION NOTE ─────────────────────────────────────────

export function DrawableNote({
  children,
  rotate = -2,
  color = 'neutral', // 'red' | 'blue' | 'neutral'
  className = '',
}) {
  const textColor =
    color === 'red'
      ? 'text-[#EF4444]'
      : color === 'blue'
      ? 'text-[#0095F6]'
      : 'text-neutral-800';

  return (
    <span
      className={`drawable-handwritten inline-block select-none ${textColor} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

// ── 11. DRAWABLE PLAY STORE SKETCH ICON ─────────────────────────────────────

export function DrawablePlayStoreIcon({
  onClick,
  className = '',
  size = 48,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Jump to Android early access"
      title="Discuss on Android (Early Access)"
      className={`group relative inline-flex items-center justify-center transition-transform hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0095F6] rounded-xs bg-white ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Hand-drawn outer border box */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 6,7 C 18,4 34,5 42,6 C 44,17 43,31 42,41 C 31,43 17,42 6,41 C 4,30 5,17 6,7 Z"
          stroke="#1F2937"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.75"
          vectorEffect="non-scaling-stroke"
          className="transition-colors duration-200 group-hover:stroke-[#0095F6] group-hover:stroke-opacity-100"
        />
        <path
          d="M 39,8 L 44,7 M 42,4 L 41,10"
          stroke="#0095F6"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Hand-drawn Play Store multi-facet triangle icon */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 relative z-10 overflow-visible"
        aria-hidden="true"
      >
        {/* Left base polygon in Charcoal */}
        <path
          d="M 7,5 C 7.5,4.7 8.3,5 8.8,5.5 L 17.5,14 L 10.5,20.5 L 7,6 Z"
          fill="#111827"
          fillOpacity="0.8"
          stroke="#111827"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Top facet in Discuss Blue */}
        <path
          d="M 8.8,5.5 L 23,13.5 C 24.2,14.2 24.2,15 23.5,15.5 L 17.5,14 Z"
          fill="#0095F6"
          fillOpacity="0.85"
          stroke="#0095F6"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Bottom facet in Discuss Red */}
        <path
          d="M 7.5,26.5 C 8,27 8.8,26.8 9.5,26.3 L 23.5,16.5 L 17.5,14 L 10.5,20.5 Z"
          fill="#EF4444"
          fillOpacity="0.85"
          stroke="#EF4444"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Play symbol sketch contour */}
        <path
          d="M 7,5 L 24,15 L 7.5,26.5 Z"
          stroke="#111827"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.9"
        />
      </svg>
    </button>
  );
}

