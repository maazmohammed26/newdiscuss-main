import { Sparkles, Shield, Tag } from 'lucide-react';

export default function SherlockAiSummary({ summary, loading }) {
  if (loading) {
    return (
      <div className="w-full p-6 rounded-2xl bg-white/5 dark:bg-[#121212]/50 discuss:bg-[#0c0c12]/80 border border-neutral-200 dark:border-neutral-800 discuss:border-white/5 animate-pulse flex flex-col gap-3">
        <div className="h-4 w-32 bg-neutral-300 dark:bg-neutral-800 rounded-md" />
        <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800/50 rounded-md" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-[#1a1a2e] dark:to-[#16213e] discuss:from-[#110d18] discuss:to-[#1a0f14] border border-blue-100 dark:border-indigo-500/20 discuss:border-red-500/20 p-6 shadow-inner">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-blue-500 discuss:text-red-500" />
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 discuss:text-red-500" />
        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-100 discuss:text-red-100">
          Discuss AI Analysis
        </h3>
      </div>

      <p className="text-[15px] leading-relaxed text-indigo-950 dark:text-indigo-100/80 discuss:text-neutral-300 font-medium relative z-10 max-w-3xl">
        {summary.summary}
      </p>

      <div className="flex flex-wrap gap-4 mt-5 relative z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/40 discuss:bg-black/60 border border-white/50 dark:border-white/10 discuss:border-white/5">
          <Tag className="w-4 h-4 text-indigo-500 discuss:text-red-400" />
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 discuss:text-neutral-300">
            {summary.type}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-black/40 discuss:bg-black/60 border border-white/50 dark:border-white/10 discuss:border-white/5">
          <Shield className={`w-4 h-4 ${
            summary.score === 'Low' ? 'text-green-500' :
            summary.score === 'Medium' ? 'text-yellow-500' : 'text-red-500'
          }`} />
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 discuss:text-neutral-300">
            Risk/Visibility: <span className={
              summary.score === 'Low' ? 'text-green-600 dark:text-green-400' :
              summary.score === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
            }>{summary.score}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
