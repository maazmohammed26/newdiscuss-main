import React from 'react';

/**
 * SectionSkeleton
 * 
 * Consistent Discuss skeleton component preserving exact layout geometry.
 * Uses neutral surfaces with subtle shimmer that adapt cleanly to light/dark themes.
 */
export default function SectionSkeleton({
  variant = 'card', // 'card' | 'list' | 'hero' | 'row' | 'grid'
  count = 1,
  className = '',
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'list' || variant === 'row') {
    return (
      <div className={`space-y-3 w-full ${className}`} data-testid="section-skeleton-list">
        {items.map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/40 animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-2/3 rounded bg-neutral-200/70 dark:bg-neutral-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 w-full ${className}`} data-testid="section-skeleton-grid">
        {items.map((i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse overflow-hidden"
          />
        ))}
      </div>
    );
  }

  // Default 'card'
  return (
    <div className={`space-y-4 w-full ${className}`} data-testid="section-skeleton-card">
      {items.map((i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-neutral-100 dark:border-[#222222] bg-white dark:bg-black space-y-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-2.5 w-16 rounded bg-neutral-200/60 dark:bg-neutral-800/60" />
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <div className="h-4 w-4/5 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-full rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
            <div className="h-3 w-2/3 rounded bg-neutral-200/60 dark:bg-neutral-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
