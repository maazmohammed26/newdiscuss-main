export default function NotificationSkeleton({ count = 6 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 divide-y divide-neutral-100 dark:divide-neutral-900">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 flex items-start gap-3.5 animate-pulse">
          {/* Unread indicator dot placeholder */}
          <div className="pt-2">
            <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              {/* Title */}
              <div className="h-4 w-1/3 rounded-md bg-neutral-200 dark:bg-neutral-800" />
              {/* Timestamp */}
              <div className="h-3 w-12 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>

            {/* Body */}
            <div className="space-y-1.5 pt-0.5">
              <div className="h-3.5 w-5/6 rounded-md bg-neutral-200/80 dark:bg-neutral-800/80" />
              <div className="h-3.5 w-1/2 rounded-md bg-neutral-100 dark:bg-neutral-800/50" />
            </div>

            {/* Sub-footer date */}
            <div className="pt-1 flex items-center justify-between">
              <div className="h-3 w-20 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              <div className="h-4 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
