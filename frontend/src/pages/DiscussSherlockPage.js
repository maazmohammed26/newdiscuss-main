import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SherlockSearchInput from '@/components/sherlock/SherlockSearchInput';
import SherlockResultCard from '@/components/sherlock/SherlockResultCard';
import SherlockActionToolbar from '@/components/sherlock/SherlockActionToolbar';
import SherlockAiSummary from '@/components/sherlock/SherlockAiSummary';
import SherlockHistoryDrawer from '@/components/sherlock/SherlockHistoryDrawer';
import { History, Target } from 'lucide-react';
import sherlockData from '@/assets/sherlock_data.json';
import { checkBulkUsernames } from '@/lib/sherlockEngine';
import { addSearchToHistory, getSearchHistory, clearSearchHistory } from '@/lib/sherlockDb';
import { generateAiSummary } from '@/lib/sherlockAi';

export default function DiscussSherlockPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [activeSearches, setActiveSearches] = useState({});
  const [results, setResults] = useState({});
  const [summaries, setSummaries] = useState({});
  const [summariesLoading, setSummariesLoading] = useState({});

  useEffect(() => {
    // Load history on mount
    setHistory(getSearchHistory());
    window.scrollTo(0, 0);
  }, []);

  const handleSearch = async (usernames, options) => {
    if (!usernames || usernames.length === 0) return;
    
    // Clear old results for these usernames
    const initialSearches = { ...activeSearches };
    usernames.forEach(u => {
      initialSearches[u] = true;
    });
    setActiveSearches(initialSearches);
    
    const platformsToUse = options.nsfw 
      ? sherlockData 
      : sherlockData.filter(p => p.category !== 'Adult');

    try {
      const allResults = await checkBulkUsernames(usernames, platformsToUse, (username, res, current, total) => {
        // Progress tracking logic if required later
      });

      // Filter based on printAll
      const finalResults = {};
      usernames.forEach(u => {
        finalResults[u] = options.printAll ? allResults[u] : allResults[u].filter(r => r.status === 'Found');
      });
      setResults(prev => ({ ...prev, ...finalResults }));

      // Process history and AI summary for each
      for (const username of usernames) {
        const userRes = finalResults[username] || [];
        const foundPlatforms = userRes.filter(r => r.status === 'Found');
        
        // Update History
        const updatedHistory = addSearchToHistory(username, platformsToUse.length, foundPlatforms.length);
        setHistory(updatedHistory);
        
        // Generate AI Summary
        setSummariesLoading(prev => ({ ...prev, [username]: true }));
        generateAiSummary(username, foundPlatforms).then(summaryObj => {
          setSummaries(prev => ({ ...prev, [username]: summaryObj }));
          setSummariesLoading(prev => ({ ...prev, [username]: false }));
        }).catch(() => {
          setSummariesLoading(prev => ({ ...prev, [username]: false }));
        });
      }

    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      // Mark search as completed
      const endingSearches = { ...activeSearches };
      usernames.forEach(u => {
        endingSearches[u] = false;
      });
      setActiveSearches(endingSearches);
    }
  };

  const isAnyLoading = Object.values(activeSearches).some(v => v);

  return (
    <div className="min-h-screen bg-[#Fbfcfd] dark:bg-[#0c0c12] discuss:bg-[#0c0c12] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-300 overflow-x-hidden">
      <Header />
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-20">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-500/10 discuss:bg-red-500/10 text-blue-600 discuss:text-red-500 mb-4 shadow-inner">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-neutral-900 dark:text-white">
            Discuss <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 discuss:from-red-500 discuss:to-orange-500 drop-shadow-sm">Sherlock</span>
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
            Investigate public digital footprints across developer platforms, social media, and forums instantly.
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Beta Version — Results Might Vary
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-20">
          <SherlockSearchInput onSearch={handleSearch} isLoading={isAnyLoading} />
          
          <div className="flex justify-center mt-6">
            <button 
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-blue-600 discuss:hover:text-red-500 transition-colors bg-white/50 dark:bg-black/20 discuss:bg-white/5 px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 discuss:border-white/5 shadow-sm active:scale-95"
            >
              <History className="w-4 h-4" />
              View Search History
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-16 space-y-16 relative z-10">
          {Object.keys(results).reverse().map(username => {
            const userResults = results[username];
            if (!userResults) return null;
            
            const foundCount = userResults.filter(r => r.status === 'Found').length;

            return (
              <div key={username} className="space-y-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800 discuss:border-white/10">
                  <div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                      @{username}
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 discuss:bg-white/10 text-neutral-600 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50 discuss:border-white/5 shadow-sm">
                        {foundCount} Found
                      </span>
                    </h2>
                  </div>
                  <SherlockActionToolbar results={userResults} username={username} />
                </div>

                {/* AI Summary */}
                <SherlockAiSummary 
                  summary={summaries[username]} 
                  loading={summariesLoading[username] || activeSearches[username]} 
                />

                {/* Cards Grid */}
                {activeSearches[username] ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50 pointer-events-none">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="h-[76px] bg-neutral-200 dark:bg-neutral-800 discuss:bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userResults.map((result, idx) => (
                      <SherlockResultCard key={idx} result={result} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <SherlockHistoryDrawer 
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelectHistory={(username) => {
          handleSearch([username], { nsfw: false, printAll: true });
        }}
        onClearHistory={() => {
          clearSearchHistory();
          setHistory([]);
        }}
      />
    </div>
  );
}
