export default function CommentSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />

            <div className="flex-1 space-y-2">
              {/* Name + time */}
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-24 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-10 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>

              {/* Text */}
              <div className="space-y-1">
                <div className="h-3.5 w-5/6 rounded-md bg-neutral-200/80 dark:bg-neutral-800/80" />
                <div className="h-3.5 w-3/5 rounded-md bg-neutral-100 dark:bg-neutral-800/50" />
              </div>

              {/* Actions: reply, like */}
              <div className="flex items-center gap-4 pt-0.5">
                <div className="h-3 w-10 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
                <div className="h-3 w-8 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            </div>
          </div>

          {/* Indented Reply Placeholder */}
          {idx === 0 && (
            <div className="pl-11 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-2.5 w-8 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
                </div>
                <div className="h-3 w-4/5 rounded-md bg-neutral-200/70 dark:bg-neutral-800/70" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
