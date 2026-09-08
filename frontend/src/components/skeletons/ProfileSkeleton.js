export default function ProfileSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6 animate-pulse">
      {/* Profile Header Card */}
      <div className="rounded-3xl border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-black p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />

          {/* Identity details */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                {/* Name + Verified Badge */}
                <div className="flex items-center gap-2">
                  <div className="h-6 w-36 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                  <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                </div>
                {/* Username */}
                <div className="h-3.5 w-24 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="h-9 w-24 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            </div>

            {/* Bio lines */}
            <div className="space-y-1.5 pt-1">
              <div className="h-3.5 w-3/4 rounded-md bg-neutral-200/80 dark:bg-neutral-800/80" />
              <div className="h-3.5 w-1/2 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>

            {/* Stats row */}
            <div className="pt-3 flex items-center gap-6 border-t border-neutral-100 dark:border-neutral-900">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-6 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-12 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-6 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-14 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-6 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-14 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-around border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="h-4 w-16 rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-4 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-4 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
      </div>

      {/* Profile Post Feed Cards */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-black p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="h-4 w-32 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="h-4 w-3/4 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3.5 w-full rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            <div className="h-3.5 w-2/3 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
