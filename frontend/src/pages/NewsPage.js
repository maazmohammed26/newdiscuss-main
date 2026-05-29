import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToNews, deleteNews } from '@/lib/firebaseSixth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NewsAdminModal from '@/components/NewsAdminModal';
import ItemShareModal from '@/components/ItemShareModal';
import ExpandableText from '@/components/ExpandableText';
import LinkifiedText from '@/components/LinkifiedText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Share2, Pencil, Trash2, ShieldCheck, ArrowUp, Newspaper, TrendingUp, Hash, ExternalLink, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Shimmer skeleton primitives ─────────────────────────────────────────── */
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#2a2a2a] ${className}`} />
);

function NewsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] rounded-3xl border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] shadow-[0_8px_30px_rgb(241,245,249)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] overflow-hidden relative">
      {/* shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent pointer-events-none z-20" />
      
      {/* Image placeholder block */}
      <Shimmer className="w-full h-48 md:h-64 rounded-none rounded-t-3xl" />
      
      <div className="p-5 md:p-6 space-y-4">
        {/* title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Shimmer className="h-7 w-3/4" />
            <Shimmer className="h-4 w-1/3" />
          </div>
        </div>
        
        {/* badges and meta row */}
        <div className="flex items-center gap-2">
          <Shimmer className="h-5 w-24" />
          <Shimmer className="h-4 w-16" />
        </div>
        
        {/* description lines */}
        <div className="space-y-2">
          <Shimmer className="h-3.5 w-full" />
          <Shimmer className="h-3.5 w-5/6" />
          <Shimmer className="h-3.5 w-4/6" />
        </div>
        
        {/* footer buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-700 discuss:border-[#333333]">
          <Shimmer className="h-9 w-28 rounded-xl" />
          <Shimmer className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Marquee (isolated to avoid re-renders) ─────────────────────────────── */
const MarqueeBar = () => (
  <div className="w-full bg-[#FEF2F2]/60 dark:bg-red-950/20 discuss:bg-[#1E1B1B] border-b border-red-100 dark:border-red-900/30 discuss:border-red-950 py-2.5 overflow-hidden relative select-none z-20">
    <div className="absolute inset-y-0 left-0 w-8 md:w-20 bg-gradient-to-r from-[#F5F5F7] dark:from-[#0F172A] discuss:from-[#121212] to-transparent z-10 pointer-events-none" />
    <div className="absolute inset-y-0 right-0 w-8 md:w-20 bg-gradient-to-l from-[#F5F5F7] dark:from-[#0F172A] discuss:from-[#121212] to-transparent z-10 pointer-events-none" />
    
    <style>{`
      @keyframes marquee {
        0% { transform: translateX(0%); }
        100% { transform: translateX(-50%); }
      }
      @keyframes shimmer {
        100% { transform: translateX(200%); }
      }
      .animate-marquee {
        display: flex;
        width: max-content;
        animation: marquee 35s linear infinite;
      }
      .animate-marquee:hover {
        animation-play-state: paused;
      }
    `}</style>
    
    <div className="animate-marquee gap-8">
      <div className="flex items-center gap-2 text-xs font-mono tracking-tight font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]">
        <span className="text-[9px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">BETA</span>
        <span>This is a beta version which is under development but you can use it in live prod.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-[#2563EB] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">MANAGED</span>
        <span>Currently both sections are handled by the Discuss Team directly.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">COMING SOON</span>
        <span>Companies and organizations can also directly add events and listings!</span>
      </div>
      
      <div className="flex items-center gap-2 text-xs font-mono tracking-tight font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]" aria-hidden="true">
        <span className="text-[9px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">BETA</span>
        <span>This is a beta version which is under development but you can use it in live prod.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-[#2563EB] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">MANAGED</span>
        <span>Currently both sections are handled by the Discuss Team directly.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">COMING SOON</span>
        <span>Companies and organizations can also directly add events and listings!</span>
      </div>
    </div>
  </div>
);

export default function NewsPage() {
  const { user } = useAuth();
  const isDiscussTeam = user?.id === 'ZUPjqx5LCwPqe2THOcIkrU7KaEj2';
  const location = useLocation();
  const navigate = useNavigate();
  
  const [news, setNews] = useState(() => {
    try {
      const cached = localStorage.getItem('discuss_fast_techNews');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Share modal state
  const [shareItem, setShareItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // HackerNews Dev Radar State
  const [hnStories, setHnStories] = useState([]);
  const [hnLoading, setHnLoading] = useState(true);
  const [hnError, setHnError] = useState(false);

  useEffect(() => {
    const fetchHNFeed = async () => {
      setHnLoading(true);
      setHnError(false);
      try {
        const cacheKey = 'discuss_hn_cache';
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          // 15 minutes cache limit
          if (Date.now() - timestamp < 15 * 60 * 1000 && data && data.length > 0) {
            setHnStories(data);
            setHnLoading(false);
            return;
          }
        }

        // Fetch fresh top stories from HN Algolia API
        const response = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5');
        if (!response.ok) throw new Error('HN fetch failed');
        const result = await response.json();
        
        if (result.hits && result.hits.length > 0) {
          const stories = result.hits.map(hit => ({
            id: hit.objectID,
            title: hit.title,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            score: hit.points || 0,
            author: hit.author || 'unknown',
            commentsCount: hit.num_comments || 0,
            domain: hit.url ? new URL(hit.url).hostname.replace('www.', '') : 'news.ycombinator.com'
          }));
          setHnStories(stories);
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: stories
          }));
        } else {
          setHnError(true);
        }
      } catch (err) {
        console.error('HN Feed load failed:', err);
        setHnError(true);
      } finally {
        setHnLoading(false);
      }
    };

    fetchHNFeed();
  }, []);

  // First load is active if we are syncing and cache is empty
  const isFirstLoad = isSyncing && news.length === 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Redirection for legacy query parameter ?id=123
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) {
      navigate(`/news/${id}`, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setIsSyncing(true);
    const unsubscribe = subscribeToNews((data) => {
      setNews(data);
      try {
        localStorage.setItem('discuss_fast_techNews', JSON.stringify(data));
      } catch (e) {}
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = useCallback((item) => {
    setEditData(item);
    setShowAdminModal(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this news?')) {
      try {
        await deleteNews(id);
        toast.success('News deleted');
      } catch (err) {
        toast.error('Failed to delete news');
      }
    }
  }, []);

  const handleShare = useCallback((item) => {
    setShareItem(item);
    setShowShareModal(true);
  }, []);

  const filteredNews = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return news.filter(item => 
      !q ||
      item.title?.toLowerCase().includes(q) || 
      item.description?.toLowerCase().includes(q)
    );
  }, [news, debouncedSearch]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      <MarqueeBar />

      {/* Syncing Indicator — only after first load (cached data exists) */}
      {isSyncing && !isFirstLoad && (
        <div className="w-full bg-[#2563EB]/5 dark:bg-blue-500/10 discuss:bg-red-500/5 border-b border-neutral-200 dark:border-neutral-800 discuss:border-[#222] py-1.5 flex items-center justify-center gap-2 select-none z-10 transition-all duration-300">
          <div className="w-3 h-3 border-2 border-[#2563EB] discuss:border-[#EF4444] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] discuss:text-[#EF4444] dark:text-[#94A3B8]">
            Syncing latest tech news...
          </span>
        </div>
      )}

      <div className="w-full max-w-5xl lg:max-w-[1300px] mx-auto px-4 lg:px-6 py-6 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 mt-6">
          <Sidebar />
          <div className="min-w-0 flex-1">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] tracking-tight flex items-center gap-2">
              Tech News <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded uppercase tracking-wider select-none">BETA</span>
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1">
              Latest updates and tech news from the community.
            </p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search news..." 
                className="pl-9 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]"
              />
            </div>
            {isDiscussTeam && (
              <Button 
                onClick={() => { setEditData(null); setShowAdminModal(true); }}
                className="bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> Add News
              </Button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Main News Content */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* HackerNews mobile/tablet widget */}
            {hnStories.length > 0 && (
              <div className="lg:hidden bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-3xl p-5 shadow-card animate-fade-in mb-6">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#222] mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                      HN Dev Radar
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">15M_CACHE</span>
                </div>
                
                <div className="flex flex-col gap-3.5">
                  {hnStories.map((story) => (
                    <div key={story.id} className="text-left group/hn border-b border-neutral-100/50 dark:border-neutral-800/50 discuss:border-white/5 pb-3 last:border-b-0 last:pb-0">
                      <a 
                        href={story.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] hover:text-[#2563EB] discuss:hover:text-[#EF4444] leading-snug line-clamp-2 transition-colors flex items-start gap-1"
                      >
                        <span>{story.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-50 transition-opacity mt-0.5" />
                      </a>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] mt-1.5 font-mono">
                        <span className="bg-neutral-50 dark:bg-neutral-900 discuss:bg-black/30 border border-neutral-200/50 dark:border-neutral-800/40 discuss:border-white/5 px-1.5 py-0.5 rounded text-[9px]">{story.domain}</span>
                        <span>•</span>
                        <span>{story.score} pts</span>
                        <span>•</span>
                        <a 
                          href={`https://news.ycombinator.com/item?id=${story.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline hover:text-[#2563EB] discuss:hover:text-[#EF4444] flex items-center gap-0.5"
                        >
                          <MessageSquare className="w-2.5 h-2.5" /> {story.commentsCount}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {isFirstLoad ? (
                Array.from({ length: 3 }).map((_, i) => <NewsCardSkeleton key={i} />)
              ) : filteredNews.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[12px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
                  <Newspaper className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                    No news found.
                  </p>
                </div>
              ) : (
                <>
                  {filteredNews.map(item => (
                    <div 
                      id={`news-${item.id}`} 
                      key={item.id} 
                      className="bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] rounded-3xl border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] shadow-[0_8px_30px_rgb(241,245,249)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.06)] hover:discuss:shadow-[0_20px_40px_rgba(239,68,68,0.06)] hover:-translate-y-1 hover:border-blue-500/30 hover:discuss:border-red-500/30 transition-all duration-300 overflow-hidden relative group"
                    >
                      {item.image && (
                        <div className="w-full h-48 md:h-64 bg-neutral-100 dark:bg-neutral-900 discuss:bg-[#000] relative overflow-hidden flex items-center justify-center">
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-contain relative z-10 select-none" 
                          />
                          <div 
                            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 select-none scale-110 pointer-events-none" 
                            style={{ backgroundImage: `url(${item.image})` }} 
                          />
                        </div>
                      )}
                      <div className="p-5 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] leading-tight">
                            {item.title}
                          </h2>
                          {isDiscussTeam && (
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleEdit(item)} className="p-2 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] text-neutral-600 dark:text-neutral-300 discuss:text-[#F5F5F5] hover:bg-[#2563EB]/10 hover:text-[#2563EB] rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-2 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] text-neutral-600 dark:text-neutral-300 discuss:text-[#F5F5F5] hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md uppercase tracking-wider shadow-sm">
                            <ShieldCheck className="w-3 h-3" /> Created by Discuss Team
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                            • {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
     
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4] whitespace-pre-wrap leading-relaxed">
                          <ExpandableText text={item.description} maxLines={5}>
                            <LinkifiedText text={item.description} />
                          </ExpandableText>
                        </div>
     
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 discuss:border-[#333333]">
                          <Button
                            variant="ghost"
                            onClick={() => navigate(`/news/${item.id}`)}
                            className="text-[#2563EB] discuss:text-[#EF4444] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10 rounded-lg font-bold text-sm"
                          >
                            Read Full News
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            onClick={() => handleShare(item)}
                            className="text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#334155] rounded-lg font-semibold"
                          >
                            <Share2 className="w-4 h-4 mr-2" /> Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
     
                  <div className="text-center py-8 mt-6 select-none animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-2xl shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        You've caught up! No more news updates.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Right Column - Desktop Sidebar (Sticky) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-20 space-y-6 animate-fade-in">
              
              {/* HackerNews Desktop Card Widget */}
              <div className="bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-3xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#222] mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                      HN Dev Radar
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">15M_CACHE</span>
                </div>

                {hnLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-[#2563EB] discuss:border-[#EF4444] border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-mono text-neutral-500">Fetching tech_pulse...</span>
                  </div>
                ) : hnError ? (
                  <div className="text-center py-6 text-xs text-neutral-500">
                    Failed to query HackerNews API.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {hnStories.map((story) => (
                      <div key={story.id} className="text-left group/hn border-b border-neutral-100/50 dark:border-neutral-800/50 discuss:border-white/5 pb-3 last:border-b-0 last:pb-0">
                        <a 
                          href={story.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] hover:text-[#2563EB] discuss:hover:text-[#EF4444] leading-snug line-clamp-2 transition-colors flex items-start gap-1"
                        >
                          <span>{story.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/hn:opacity-50 transition-opacity mt-0.5" />
                        </a>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] mt-1.5 font-mono">
                          <span className="bg-neutral-50 dark:bg-neutral-900 discuss:bg-black/30 border border-neutral-200/50 dark:border-neutral-800/40 discuss:border-white/5 px-1.5 py-0.5 rounded text-[9px]">{story.domain}</span>
                          <span>•</span>
                          <span>{story.score} pts</span>
                          <span>•</span>
                          <a 
                            href={`https://news.ycombinator.com/item?id=${story.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline hover:text-[#2563EB] discuss:hover:text-[#EF4444] flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-2.5 h-2.5" /> {story.commentsCount}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ecosystem Disclaimer Banner */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 discuss:bg-black/35 border border-neutral-100 dark:border-neutral-800/50 discuss:border-[#222] rounded-3xl p-4 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] space-y-1">
                <div className="text-neutral-500 dark:text-neutral-600 font-bold mb-1">◈ ECOSYSTEM_INFO:</div>
                <div>// items in main feed are verified</div>
                <div>// compiled by discuss administration</div>
                <div>// external tech stories are simulated</div>
                <div>// direct comments synced via api</div>
              </div>

            </div>
          </div>

          </div>
        </div>
      </div>
    </div>
      
      {showAdminModal && (
        <NewsAdminModal 
          open={showAdminModal} 
          onClose={() => setShowAdminModal(false)} 
          editData={editData} 
        />
      )}
 
      {showShareModal && shareItem && (
        <ItemShareModal
          open={showShareModal}
          onClose={() => { setShowShareModal(false); setShareItem(null); }}
          item={shareItem}
          type="news"
        />
      )}
 
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-32 md:bottom-12 right-6 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:scale-110 transition-transform z-50 group flex items-center justify-center border border-white/20"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </div>
  );
}
