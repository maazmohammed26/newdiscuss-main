import React from 'react';
import DelayedNetworkLoader from './DelayedNetworkLoader';
import FocusReveal from './FocusReveal';

/**
 * AdaptiveLoadBoundary
 * 
 * Unified orchestrator for Discuss's Adaptive Hybrid Loading & Focus Reveal System:
 * - Cache-First: If valid cached data exists (`hasData = true`), renders immediately.
 * - Silent Revalidation: Keeps cached UI completely stable during background updates.
 * - Unknown Structure: If uncached (`!hasData`), renders layout-matching skeleton.
 * - Noticeable Wait: If request exceeds delay threshold (~600ms), shows small DiscussLoadingDots
 *   in a calm, designated position (never stacked directly on top of skeleton shimmer).
 * - Correct Content Ready: Gently reveals resolved canonical content via FocusReveal.
 * - Non-infinite Exit: Clean error/empty state display without hanging loaders.
 */
export default function AdaptiveLoadBoundary({
  isLoading = false,
  hasData = false,
  skeleton = null,
  error = null,
  errorFallback = null,
  isEmpty = false,
  emptyFallback = null,
  loaderDelay = 600,
  loaderMinVisible = 220,
  loaderPosition = 'header', // 'header' | 'top' | 'bottom' | 'inline' | 'none'
  focusVariant = 'standard', // 'standard' | 'hero' | 'media'
  revealKey = null,
  triggerKey = null,
  children,
  className = '',
}) {
  // 1. Error state when no cached data exists
  if (error && !hasData && errorFallback) {
    return errorFallback;
  }

  // 2. Uncached initial load: show skeleton + reserved delayed loader
  if (isLoading && !hasData) {
    return (
      <div className={`adaptive-load-boundary-skeleton relative w-full ${className}`}>
        {loaderPosition !== 'none' && (
          <div className="flex justify-center py-2">
            <DelayedNetworkLoader
              active={true}
              delay={loaderDelay}
              minVisible={loaderMinVisible}
              size="sm"
              mode="inline"
            />
          </div>
        )}
        {skeleton}
      </div>
    );
  }

  // 3. Empty state once resolved
  if (!isLoading && isEmpty && emptyFallback) {
    return emptyFallback;
  }

  // 4. Resolved content with FocusReveal (or cached content with background refresh loader)
  return (
    <div className={`adaptive-load-boundary-content relative w-full ${className}`}>
      {/* Background refresh indicator when valid cache already exists and revalidation is slow */}
      {isLoading && hasData && loaderPosition !== 'none' && (
        <div className="flex justify-end px-4 py-1">
          <DelayedNetworkLoader
            active={true}
            delay={loaderDelay}
            minVisible={loaderMinVisible}
            size="inline"
            mode="inline"
          />
        </div>
      )}

      <FocusReveal
        ready={hasData}
        variant={focusVariant}
        revealKey={revealKey ?? triggerKey}
      >
        {children}
      </FocusReveal>
    </div>
  );
}
