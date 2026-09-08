import { useState } from 'react';
import verifiedBadgeImg from '@/assets/verified-badge.png';
import { isUserVerified } from '@/lib/verification';

const SIZES = {
  xs: 'w-[14px] h-[14px] min-w-[14px]',
  sm: 'w-[16px] h-[16px] min-w-[16px]',
  md: 'w-[20px] h-[20px] min-w-[20px]',
  lg: 'w-[24px] h-[24px] min-w-[24px]',
};

/**
 * Discuss Canonical Verified Badge
 *
 * Uses the official blue Dev Seal asset with optical baseline centering.
 * Can be used directly or by passing a `user` or entity prop.
 */
export default function VerifiedBadge({
  user = null,
  size = 'sm',
  className = '',
  showTooltipOnHover = true,
  title = 'Verified account',
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // If an entity/user is provided, determine visibility via unified resolver
  if (user !== null && !isUserVerified(user)) {
    return null;
  }

  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`relative inline-flex items-center justify-center align-middle select-none shrink-0 -top-[0.5px] mx-0.5 ${className}`}
      role="img"
      aria-label="Verified account"
      onMouseEnter={() => showTooltipOnHover && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      onFocus={() => showTooltipOnHover && setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(false)}
      tabIndex={-1}
    >
      <img
        src={verifiedBadgeImg}
        alt=""
        aria-hidden="true"
        className={`${sizeClass} object-contain pointer-events-none drop-shadow-none`}
        loading="eager"
        decoding="async"
        draggable={false}
      />

      {tooltipVisible && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white shadow-md dark:bg-neutral-100 dark:text-neutral-900 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {title}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
        </span>
      )}
    </span>
  );
}

/**
 * Shared User Identity Name Row
 * Ensures consistent optical alignment between username text and verified badge.
 */
export function IdentityNameRow({
  user,
  name,
  badgeSize = 'sm',
  className = '',
  nameClassName = '',
  onClick,
  children,
}) {
  const verified = isUserVerified(user);
  const displayName = name || user?.displayName || user?.username || user?.fullName || 'User';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center min-w-0 max-w-full ${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
    >
      <span className={`truncate ${nameClassName}`}>{displayName}</span>
      {verified && <VerifiedBadge size={badgeSize} className="ml-1" />}
      {children}
    </div>
  );
}
