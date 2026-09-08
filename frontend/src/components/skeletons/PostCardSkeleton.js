export default function PostCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <article
          key={idx}
          className="rounded-2xl border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-black p-4 sm:p-5 shadow-xs animate-pulse"
        >
          {/* Author bar */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              {/* Username + verified badge + timestamp */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-3.5 w-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
                <div className="h-3 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            </div>

            {/* Menu dots */}
            <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800/50" />
          </div>

          {/* Title & Tags */}
          <div className="space-y-2 mb-3">
            <div className="h-5 w-4/5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800/60" />
              <div className="h-5 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          </div>

          {/* Body Lines */}
          <div className="space-y-2 mb-4">
            <div className="h-3.5 w-full rounded-md bg-neutral-200/70 dark:bg-neutral-800/70" />
            <div className="h-3.5 w-11/12 rounded-md bg-neutral-200/70 dark:bg-neutral-800/70" />
            <div className="h-3.5 w-3/4 rounded-md bg-neutral-200/50 dark:bg-neutral-800/50" />
          </div>

          {/* Interaction Bar */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3.5 w-6 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3.5 w-6 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </article>
      ))}
    </div>
  );
}
