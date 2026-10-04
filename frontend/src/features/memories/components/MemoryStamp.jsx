import React, { memo, useState } from 'react';
import { memoryStorage } from '../data/memoryStorageService';
import { getStableRotation, STAMP_VARIANTS } from '../utils/stampTheme';
import { formatDisplayDate } from '../utils/dateUtils';
import { MapPin, Image as ImageIcon } from 'lucide-react';

/**
 * MemoryStamp — The core postage stamp visual identity for Discuss Memories.
 *
 * Renders an authentic postage stamp with:
 * - Crisp perforated paper border
 * - Inner photo framing
 * - Subtle tactile depth & shadows
 * - Organic micro-rotations
 * - Optimized Cloudinary transformations per variant
 */
function MemoryStamp({
  memory,
  variant = STAMP_VARIANTS.GALLERY,
  onClick,
  rotation,
  showDate = false,
  showCaption = false,
  tape = 'none',
  className = '',
  priority = false,
  alt = 'Discuss Memory',
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!memory) return null;

  const publicId = memory.cloudinaryPublicId || memory.publicId;
  const directUrl = memory.cloudinaryUrl || memory.url;

  // Resolve optimal Cloudinary variant URL
  let imageUrl = directUrl;
  if (publicId && !publicId.startsWith('blob:')) {
    switch (variant) {
      case STAMP_VARIANTS.CALENDAR:
        imageUrl = memoryStorage.getThumbnailUrl(publicId);
        break;
      case STAMP_VARIANTS.SCRAPBOOK:
        imageUrl = memoryStorage.getScrapbookUrl(publicId);
        break;
      case STAMP_VARIANTS.VIEWER:
        imageUrl = memoryStorage.getFullUrl(publicId);
        break;
      case STAMP_VARIANTS.SHARED:
      case STAMP_VARIANTS.PUBLIC:
        imageUrl = memoryStorage.getFeedUrl(publicId);
        break;
      case STAMP_VARIANTS.PREVIEW:
      case STAMP_VARIANTS.GALLERY:
      default:
        imageUrl = memoryStorage.getScrapbookUrl(publicId);
        break;
    }
  }

  // Calculate organic rotation
  const deg = typeof rotation === 'number' 
    ? rotation 
    : (variant === STAMP_VARIANTS.SCRAPBOOK ? getStableRotation(memory.id) : 0);

  // Variant sizing and layout classes
  let containerDimensions = '';
  let imageDimensions = '';

  switch (variant) {
    case STAMP_VARIANTS.CALENDAR:
      containerDimensions = 'w-10 h-10 sm:w-11 sm:h-11 p-1';
      imageDimensions = 'w-full h-full';
      break;

    case STAMP_VARIANTS.SCRAPBOOK:
      containerDimensions = 'w-full p-2';
      imageDimensions = 'w-full aspect-[4/5] object-cover';
      break;

    case STAMP_VARIANTS.GALLERY:
      containerDimensions = 'w-full p-2';
      imageDimensions = 'w-full aspect-square sm:aspect-[4/5] object-cover';
      break;

    case STAMP_VARIANTS.PREVIEW:
      containerDimensions = 'w-full max-w-[280px] p-2.5';
      imageDimensions = 'w-full aspect-[4/5] object-cover';
      break;

    case STAMP_VARIANTS.VIEWER:
      containerDimensions = 'max-w-full max-h-[75vh] p-3 sm:p-4';
      imageDimensions = 'max-h-[65vh] w-auto max-w-full object-contain';
      break;

    case STAMP_VARIANTS.SHARED:
    case STAMP_VARIANTS.PUBLIC:
    default:
      containerDimensions = 'w-full p-2.5 sm:p-3';
      imageDimensions = 'w-full max-h-[460px] aspect-[4/5] object-cover';
      break;
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      style={{
        transform: deg !== 0 ? `rotate(${deg}deg)` : undefined,
      }}
      className={`postage-stamp-container ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''} ${className}`}
      aria-label={memory.caption ? `Memory stamp: ${memory.caption}` : 'Memory stamp'}
    >
      {/* Washi Tape strip in scrapbook mode */}
      {variant === STAMP_VARIANTS.SCRAPBOOK && tape !== 'none' && (
        <div
          className={`absolute -top-2 z-10 h-4 w-12 rounded-xs washi-tape-strip ${
            tape === 'top-left' ? 'left-2 -rotate-12' : tape === 'top-right' ? 'right-2 rotate-12' : 'left-1/2 -translate-x-1/2 -rotate-2'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Postage Stamp Outer Paper with serrated edges */}
      <div className={`postage-stamp-paper ${containerDimensions} relative flex flex-col items-center justify-center`}>
        {/* Inner Stamp Framing */}
        <div className="relative w-full h-full overflow-hidden rounded-xs bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center stamp-inner-border">
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-200/50 dark:bg-neutral-800/50 animate-pulse">
              <ImageIcon className="w-5 h-5 text-neutral-400 opacity-60" />
            </div>
          )}

          {error ? (
            <div className="p-4 text-center flex flex-col items-center justify-center text-neutral-400 text-xs">
              <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
              <span>Image unavailable</span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={memory.caption || alt}
              loading={priority ? 'eager' : 'lazy'}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              className={`${imageDimensions} rounded-[1px] transition-opacity duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Postal postmark cancellation watermark on scrapbook/gallery */}
          {(variant === STAMP_VARIANTS.SCRAPBOOK || variant === STAMP_VARIANTS.GALLERY) && memory.memoryDate && (
            <div
              className="absolute bottom-1.5 right-1.5 w-10 h-10 rounded-full border border-neutral-800/15 dark:border-white/15 flex items-center justify-center text-[8px] font-mono tracking-tighter text-neutral-800/30 dark:text-white/30 rotate-12 pointer-events-none select-none"
              aria-hidden="true"
            >
              <span>{memory.memoryDate.slice(5)}</span>
            </div>
          )}
        </div>

        {/* Optional caption or location underneath stamp photo */}
        {showCaption && memory.caption && (
          <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 px-1 text-center font-normal">
            {memory.caption}
          </p>
        )}

        {showDate && memory.memoryDate && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 px-1">
            <span>{formatDisplayDate(memory.memoryDate)}</span>
            {memory.location && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px] flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {memory.location}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MemoryStamp);
