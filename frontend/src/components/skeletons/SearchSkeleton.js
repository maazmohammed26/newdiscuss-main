export default function SearchSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* People section skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-20 rounded-md bg-neutral-200 dark:bg-neutral-800 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-black flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3.5 w-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                  <div className="h-3 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
                </div>
              </div>
              <div className="h-8 w-18 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Discussion posts skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-4 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800 mb-2" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-black space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3.5 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-12 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
            <div className="h-4 w-4/5 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3.5 w-full rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
