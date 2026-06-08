import { useState } from 'react';
import { Search, Settings, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SherlockSearchInput({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState({
    nsfw: false,
    printAll: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      // split by comma if bulk
      const usernames = query.split(',').map(s => s.trim()).filter(Boolean);
      onSearch(usernames, options);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group z-10 w-full max-w-[100vw] overflow-hidden sm:overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 discuss:from-red-500/30 discuss:via-orange-500/30 discuss:to-red-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
        <div className="relative flex items-center bg-white/70 dark:bg-[#121212]/80 discuss:bg-[#0c0c12]/90 border border-neutral-200 dark:border-neutral-800 discuss:border-white/10 rounded-2xl p-1.5 sm:p-2.5 backdrop-blur-xl shadow-xl transition-all focus-within:border-blue-500/50 discuss:focus-within:border-red-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 discuss:focus-within:ring-red-500/10 w-full">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 discuss:text-red-500 ml-2 sm:ml-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="maaz123, dev (comma for bulk)"
            className="flex-1 min-w-0 bg-transparent border-none outline-none px-2 sm:px-4 py-3 text-neutral-900 dark:text-neutral-50 discuss:text-white placeholder-neutral-400 font-mono text-[15px] sm:text-lg"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 sm:p-3 text-neutral-400 hover:text-blue-600 discuss:hover:text-red-500 transition-colors shrink-0"
            title="Advanced Options"
          >
            <Settings className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${showAdvanced ? 'rotate-90 text-blue-600 discuss:text-red-500' : ''}`} />
          </button>
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="ml-1 sm:ml-2 bg-blue-600 hover:bg-blue-500 discuss:bg-red-500 discuss:hover:bg-red-400 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 font-bold group/btn shadow-[0_4px_14px_rgba(37,99,235,0.39)] discuss:shadow-[0_4px_14px_rgba(239,68,68,0.39)] shrink-0"
          >
            {isLoading ? (
              <Activity className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline tracking-wide">Investigate</span>
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white/60 dark:bg-[#1a1a1a]/60 discuss:bg-[#121212]/60 border border-neutral-200/50 dark:border-neutral-800/50 discuss:border-white/5 rounded-2xl flex flex-wrap gap-8 items-center backdrop-blur-md shadow-inner">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={options.printAll}
                  onChange={(e) => setOptions(prev => ({ ...prev, printAll: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded border-neutral-300 text-blue-600 discuss:text-red-500 focus:ring-blue-500 discuss:focus:ring-red-500 bg-white dark:bg-neutral-800 dark:border-neutral-700 cursor-pointer transition-colors"
                />
                <span className="text-[13px] font-bold text-neutral-600 dark:text-neutral-400 discuss:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors uppercase tracking-wider">
                  Show "Not Found" Platforms
                </span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={options.nsfw}
                  onChange={(e) => setOptions(prev => ({ ...prev, nsfw: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded border-neutral-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-neutral-800 dark:border-neutral-700 cursor-pointer transition-colors"
                />
                <span className="text-[13px] font-bold text-neutral-600 dark:text-neutral-400 discuss:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors uppercase tracking-wider">
                  Include NSFW / Adult Sites
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
