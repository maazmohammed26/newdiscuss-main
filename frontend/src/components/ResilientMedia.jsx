import React, { useState, useEffect, useRef } from 'react';
import { ImageOff, VideoOff, Loader2 } from 'lucide-react';

// Module-level cache of URLs that have failed to load, preventing infinite
// or repeated retry storms across React rerenders.
const failedUrlRegistry = new Set();

/**
 * ResilientMedia renders images or videos with guaranteed failure resilience:
 * - Attempts normal rendering of media once.
 * - On actual load failure (403, 503, CORS, or blocked response):
 *   - Stops retrying immediately.
 *   - Preserves dimensions and aspect-ratio container so card never collapses.
 *   - Displays a clean, elegant Discuss placeholder state instead of broken-image icons.
 * - Does not attempt to bypass browser security restrictions.
 */
export default function ResilientMedia({
  src,
  alt = 'Media',
  className = 'w-full h-full object-cover',
  aspectRatioClassName = 'aspect-square',
  isVideo = false,
  containerClassName = '',
  onClick,
  priority = false,
}) {
  const isVideoMedia = Boolean(
    isVideo ||
    (typeof src === 'string' && (src.endsWith('.mp4') || src.endsWith('.webm') || src.includes('/video/')))
  );

  const isAlreadyFailed = !src || failedUrlRegistry.has(src);
  const [hasFailed, setHasFailed] = useState(isAlreadyFailed);
  const [isLoading, setIsLoading] = useState(!isAlreadyFailed && Boolean(src));
  const lastSrcRef = useRef(src);

  useEffect(() => {
    if (src !== lastSrcRef.current) {
      lastSrcRef.current = src;
      if (!src || failedUrlRegistry.has(src)) {
        setHasFailed(true);
        setIsLoading(false);
      } else {
        setHasFailed(false);
        setIsLoading(true);
      }
    }
  }, [src]);

  const handleError = () => {
    if (src) {
      failedUrlRegistry.add(src);
    }
    setHasFailed(true);
    setIsLoading(false);
  };

  const handleLoaded = () => {
    setIsLoading(false);
  };

  if (!src || hasFailed) {
    return (
      <div
        className={`relative w-full ${aspectRatioClassName} flex flex-col items-center justify-center bg-neutral-100 dark:bg-[#121212] border border-neutral-200/60 dark:border-neutral-800 text-neutral-400 select-none overflow-hidden ${containerClassName}`}
        role="img"
        aria-label={alt || 'Unavailable media'}
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          {isVideoMedia ? (
            <VideoOff className="w-8 h-8 mb-2 opacity-60 text-neutral-400 dark:text-neutral-500 stroke-[1.8px]" />
          ) : (
            <ImageOff className="w-8 h-8 mb-2 opacity-60 text-neutral-400 dark:text-neutral-500 stroke-[1.8px]" />
          )}
          <span className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">
            Media unavailable
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Content could not be loaded
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${aspectRatioClassName} bg-neutral-900/10 dark:bg-black/40 ${containerClassName}`}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/50 dark:bg-neutral-900/50 z-10 pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      )}

      {isVideoMedia ? (
        <video
          src={src}
          className={className}
          controls={false}
          muted
          loop
          playsInline
          onLoadedData={handleLoaded}
          onError={handleError}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleLoaded}
          onError={handleError}
        />
      )}
    </div>
  );
}
