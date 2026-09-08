import React from 'react';

/**
 * ProfileHeroSkeleton
 * Rendered when profile data or banner is loading and not yet resolved,
 * preventing any flash of default gradient or old content.
 */
export default function ProfileHeroSkeleton({ hasTopBar = false }) {
  return (
    <div className="w-full select-none" data-testid="profile-hero-skeleton">
      {/* Banner Skeleton */}
      <div className="relative w-full h-32 sm:h-36 md:h-44 bg-neutral-200 dark:bg-neutral-800/80 animate-pulse overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Hero Body Skeleton */}
      <div className="px-4 pb-4 border-b border-[#EFEFEF] dark:border-[#262626] bg-white dark:bg-black">
        {/* Avatar & Action Row */}
        <div className="flex items-end justify-between -mt-11 sm:-mt-12 md:-mt-14 mb-3">
          <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] md:w-[104px] md:h-[104px] rounded-full ring-4 ring-white dark:ring-black bg-neutral-200 dark:bg-neutral-800 animate-pulse shadow-md shrink-0" />
          
          <div className="flex items-center gap-2">
            <div className="w-24 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          </div>
        </div>

        {/* Text Lines */}
        <div className="space-y-1.5 pt-0.5">
          <div className="h-5 w-44 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="h-3.5 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800/60 animate-pulse" />
        </div>

        {/* Bio Skeleton */}
        <div className="mt-3 space-y-1.5 max-w-md">
          <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800/60 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800/50 animate-pulse" />
        </div>

        {/* Meta / Links Skeleton */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3.5 w-28 rounded bg-neutral-200 dark:bg-neutral-800/60 animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-neutral-200 dark:bg-neutral-800/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
