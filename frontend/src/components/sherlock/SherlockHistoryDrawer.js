import { Clock, X, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SherlockHistoryDrawer({ isOpen, onClose, history, onSelectHistory, onClearHistory }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white dark:bg-[#0c0c12] discuss:bg-[#0c0c12] border-l border-neutral-200 dark:border-neutral-800 discuss:border-white/5 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 discuss:border-white/5">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 discuss:text-red-500" />
                <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100 discuss:text-white">
                  Search History
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 discuss:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 gap-3 opacity-60">
                  <Search className="w-10 h-10" />
                  <p className="text-sm font-medium">No previous searches</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectHistory(item.username);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 discuss:border-white/5 bg-white dark:bg-[#1a1a1a] discuss:bg-[#1a1a1a] hover:border-blue-500/50 discuss:hover:border-red-500/50 transition-all text-left group"
                  >
                    <div>
                      <h4 className="font-bold text-neutral-900 dark:text-neutral-100 discuss:text-white font-mono flex items-center gap-2">
                        {item.username}
                        {item.tag && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 discuss:bg-red-900/30 discuss:text-red-400 uppercase tracking-wider">
                            {item.tag}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        Found {item.foundCount} of {item.platformCount} platforms
                      </p>
                    </div>
                    <Search className="w-4 h-4 text-neutral-300 group-hover:text-blue-500 discuss:group-hover:text-red-500 transition-colors" />
                  </button>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 discuss:border-white/5">
                <button
                  onClick={onClearHistory}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 discuss:hover:bg-red-900/20 font-bold text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
