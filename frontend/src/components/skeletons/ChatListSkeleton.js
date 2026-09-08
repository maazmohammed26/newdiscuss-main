export default function ChatListSkeleton({ count = 6 }) {
  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-900 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3.5 p-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />

          {/* Details */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3.5 w-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="h-3 w-10 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-48 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              {idx % 2 === 0 && <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
