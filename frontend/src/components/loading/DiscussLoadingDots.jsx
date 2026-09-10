import React from 'react';

/**
 * DiscussLoadingDots
 * 
 * Official Discuss delayed-loading animation.
 * Faithfully reproduces the visual geometry, 30fps pingpong timing,
 * and 3-dot pulse motion defined in loading.json:
 * - 3 dots with staggered pingpong bounce (0ms, 133ms, 267ms)
 * - Scale oscillation (0.7 -> 1.0) and vertical translation
 * - Lightweight, zero-dependency SVG with GPU-accelerated CSS
 * - Honors prefers-reduced-motion and dark mode
 */
export default function DiscussLoadingDots({
  size = 'sm', // 'inline' (24px) | 'sm' (32-36px) | 'md' (40-44px) | 'lg' (56px)
  className = '',
  color = '#9BAEC6', // From loading.json fill: rgb(0.6078, 0.6706, 0.7765)
  title = 'Loading...',
  ...props
}) {
  const sizeStyles = {
    inline: { width: '24px', height: '12px' },
    sm: { width: '36px', height: '18px' },
    md: { width: '44px', height: '22px' },
    lg: { width: '56px', height: '28px' },
  };

  const currentSize = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={`discuss-loading-dots discuss-loading-dots-${size} inline-flex items-center justify-center select-none ${className}`}
      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
      role="status"
      aria-label={title}
      data-testid="discuss-loading-dots"
      {...props}
    >
      <svg
        viewBox="190 235 120 50"
        style={{
          width: currentSize.width,
          height: currentSize.height,
          overflow: 'visible',
        }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <style>{`
            @keyframes discuss-dot-bounce {
              0%, 100% {
                transform: translateY(0px) scale(0.7);
                opacity: 0.65;
              }
              50% {
                transform: translateY(-20px) scale(1.0);
                opacity: 1;
              }
            }
            .discuss-anim-dot {
              transform-box: fill-box;
              transform-origin: center center;
              animation: discuss-dot-bounce 1.333s cubic-bezier(0.333, 0, 0.667, 1) infinite;
            }
            .discuss-anim-dot-1 {
              animation-delay: 0s;
            }
            .discuss-anim-dot-2 {
              animation-delay: 0.133s;
            }
            .discuss-anim-dot-3 {
              animation-delay: 0.267s;
            }
            @media (prefers-reduced-motion: reduce) {
              .discuss-anim-dot {
                animation: none !important;
                transform: none !important;
                opacity: 0.85 !important;
              }
            }
          `}</style>
        </defs>

        {/* Cricle 1 (x: 210, y: 270 -> 250) */}
        <circle
          cx="210"
          cy="270"
          r="10"
          fill={color}
          className="discuss-anim-dot discuss-anim-dot-1 discuss-loading-dot dark:opacity-90"
        />

        {/* Cricle 2 (x: 250, y: 270 -> 250, delay: 4 frames / 133ms) */}
        <circle
          cx="250"
          cy="270"
          r="10"
          fill={color}
          className="discuss-anim-dot discuss-anim-dot-2 discuss-loading-dot dark:opacity-90"
        />

        {/* Cricle 3 (x: 290, y: 270 -> 250, delay: 8 frames / 267ms) */}
        <circle
          cx="290"
          cy="270"
          r="10"
          fill={color}
          className="discuss-anim-dot discuss-anim-dot-3 discuss-loading-dot dark:opacity-90"
        />
      </svg>
    </span>
  );
}
