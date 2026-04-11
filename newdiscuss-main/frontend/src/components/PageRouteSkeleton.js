/**
 * Full-viewport route skeleton for lazy-loaded pages (Suspense fallback).
 */
export default function PageRouteSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212]">
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 discuss:border-[#333333] bg-white dark:bg-neutral-900 discuss:bg-[#1a1a1a] animate-pulse">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="h-8 w-28 rounded-md bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
          <div className="flex gap-2">
            <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
            <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 rounded-md bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 rounded-[12px] bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] overflow-hidden animate-pulse"
            >
              <div className="p-4 flex gap-3">
                <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-1/3 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] rounded" />
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-600 discuss:bg-[#262626] rounded" />
                  <div className="h-2 w-4/5 bg-neutral-100 dark:bg-neutral-600 discuss:bg-[#262626] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
