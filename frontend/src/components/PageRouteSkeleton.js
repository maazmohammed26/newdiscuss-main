/**
 * Full-viewport route skeleton for lazy-loaded pages (Suspense fallback).
 * Styled perfectly to match the premium dark cinematic Discuss platform theme.
 */
export default function PageRouteSkeleton() {
  return (
    <div className="min-h-screen bg-black text-[#E1E0CC] select-none relative overflow-hidden">
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />

      {/* Header Skeleton */}
      <header className="h-14 border-b border-white/5 bg-black/90 backdrop-blur-md animate-pulse relative">
        {/* Top red-and-blue thick accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#DC2626] to-[#2563EB]" />

        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo Placeholder */}
          <div className="h-6 w-24 rounded-lg bg-[#181818] border border-white/5" />
          
          <div className="flex gap-3">
            <div className="h-9 w-14 rounded-xl bg-[#181818] border border-white/5" />
            <div className="h-9 w-9 rounded-xl bg-[#181818] border border-white/5" />
            <div className="h-9 w-9 rounded-xl bg-[#181818] border border-white/5" />
          </div>
        </div>
      </header>

      {/* Main Skeleton */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 relative z-10">
        <div className="h-7 w-40 rounded-lg bg-[#181818] border border-white/5 animate-pulse" />
        
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[#101010] border border-white/5 overflow-hidden animate-pulse relative pt-1"
            >
              {/* Subtle top border gradient accent on cards */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#DC2626]/20 to-[#2563EB]/20" />

              <div className="p-4 flex gap-4 items-start">
                <div className="h-12 w-12 rounded-xl bg-[#181818] border border-white/5 shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-3 w-1/4 bg-[#181818] rounded-md border border-white/5" />
                  <div className="h-2.5 w-full bg-[#181818] rounded-md border border-white/5" />
                  <div className="h-2.5 w-5/6 bg-[#181818] rounded-md border border-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
