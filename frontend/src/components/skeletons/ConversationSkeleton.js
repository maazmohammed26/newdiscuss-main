export default function ConversationSkeleton() {
  return (
    <div className="flex flex-col h-full w-full animate-pulse bg-neutral-50/50 dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-1">
            <div className="h-4 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-2.5 w-16 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/50" />
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Left message */}
        <div className="flex items-end gap-2.5 max-w-[75%]">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="space-y-1.5 p-3 rounded-2xl rounded-bl-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
            <div className="h-3.5 w-44 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3.5 w-32 rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>

        {/* Right message */}
        <div className="flex items-end justify-end gap-2.5 ml-auto max-w-[75%]">
          <div className="space-y-1.5 p-3 rounded-2xl rounded-br-xs bg-[#0095F6]/20 dark:bg-[#0095F6]/30 border border-[#0095F6]/30 shadow-2xs">
            <div className="h-3.5 w-36 rounded-md bg-blue-300 dark:bg-blue-500/50" />
          </div>
        </div>

        {/* Left message with code snippet block */}
        <div className="flex items-end gap-2.5 max-w-[75%]">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="space-y-2 p-3 rounded-2xl rounded-bl-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs w-64">
            <div className="h-3.5 w-40 rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-14 w-full rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
          </div>
        </div>

        {/* Right message */}
        <div className="flex items-end justify-end gap-2.5 ml-auto max-w-[75%]">
          <div className="space-y-1.5 p-3 rounded-2xl rounded-br-xs bg-[#0095F6]/20 dark:bg-[#0095F6]/30 border border-[#0095F6]/30 shadow-2xs">
            <div className="h-3.5 w-48 rounded-md bg-blue-300 dark:bg-blue-500/50" />
            <div className="h-3.5 w-24 rounded-md bg-blue-200 dark:bg-blue-500/40" />
          </div>
        </div>
      </div>

      {/* Input row */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      </div>
    </div>
  );
}
