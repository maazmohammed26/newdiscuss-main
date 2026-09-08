import { PostCardSkeleton } from '@/components/skeletons';

/**
 * Full-viewport route skeleton for lazy-loaded pages (Suspense fallback).
 * Matches Discuss design system in light and dark modes.
 */
export default function PageRouteSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 dark:bg-black dark:text-white select-none relative overflow-hidden">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 w-full h-12 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-[#DBDBDB] dark:border-[#262626] animate-pulse">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-7 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </header>

      {/* Main Skeleton */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <PostCardSkeleton count={3} />
      </main>
    </div>
  );
}
