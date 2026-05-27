import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPosts, getTrendingHashtags, subscribeToPostsRealtime } from '@/lib/db';
import { searchUsers } from '@/lib/relationshipsDb';
import { 
  getCachedPosts, 
  cachePosts, 
  isCacheValid, 
  CACHE_DURATION 
} from '@/lib/cacheManager';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import LoadingScreen from '@/components/LoadingScreen';
import UserSearchResult from '@/components/UserSearchResult';
import SignalStoriesRow from '@/components/SignalStoriesRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, FolderGit2, WifiOff, Loader2, Search, X, Hash, TrendingUp, Users, PlayCircle, Cpu, Layers, RotateCcw, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const MemoPostCard = memo(PostCard);

export default function FeedPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [trendingTags, setTrendingTags] = useState([]);
  const [activeTab, setActiveTab] = useState('discussion');
  const [searchType, setSearchType] = useState('posts'); // 'posts' or 'users'
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  // Tinder-style slide view deck states
  const [viewMode, setViewMode] = useState(() => {
    return sessionStorage.getItem('discuss_feed_view_mode') || 'list';
  });
  
  const [slideIndex, setSlideIndex] = useState(() => {
    const saved = sessionStorage.getItem(`discuss_slide_index_${activeTab}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Track page reload to reset stack indices back to 0
  useEffect(() => {
    const perf = window.performance?.getEntriesByType('navigation')[0];
    if (perf?.type === 'reload') {
      sessionStorage.removeItem('discuss_slide_index_discussion');
      sessionStorage.removeItem('discuss_slide_index_project');
      setSlideIndex(0);
    }
  }, []);

  // Save viewMode preference to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('discuss_feed_view_mode', viewMode);
  }, [viewMode]);

  // Save slideIndex preference to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(`discuss_slide_index_${activeTab}`, slideIndex);
  }, [slideIndex, activeTab]);

  // Reset slideIndex state dynamically when switching tabs
  useEffect(() => {
    const saved = sessionStorage.getItem(`discuss_slide_index_${activeTab}`);
    setSlideIndex(saved ? parseInt(saved, 10) : 0);
  }, [activeTab]);

  const [swipeDirection, setSwipeDirection] = useState('right');
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  const handleNext = () => {
    if (slideIndex < filteredPosts.length) {
      setSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(prev => prev - 1);
    }
  };

  const handleStartOver = () => {
    setSlideIndex(0);
  };

  const handleDragEnd = (event, info) => {
    const threshold = 120;
    if (info.offset.x > threshold) {
      setSwipeDirection('right');
      handleNext();
    } else if (info.offset.x < -threshold) {
      setSwipeDirection('left');
      handleNext();
    }
  };

  // Load cached posts first for instant display, then fetch fresh data
  useEffect(() => {
    const loadWithCache = async () => {
      try {
        // Try to get cached posts first
        const cachedData = await getCachedPosts();
        if (cachedData && cachedData.length > 0) {
          setAllPosts(cachedData);
          setLoading(false);
          setLoadedFromCache(true);
        }
        
        // Check if cache is still valid
        const isValid = await isCacheValid('posts', CACHE_DURATION.POSTS);
        
        // If cache is invalid or empty, fetch fresh data
        if (!isValid || !cachedData || cachedData.length === 0) {
          const freshData = await getPosts();
          setAllPosts(freshData);
          await cachePosts(freshData);
          setLoadedFromCache(false);
        }
      } catch (err) {
        console.error('Cache/fetch error:', err);
        // Fallback to direct fetch
        try {
          const data = await getPosts();
          setAllPosts(data);
          await cachePosts(data);
        } catch (fetchErr) {
          console.error('Failed to fetch posts:', fetchErr);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadWithCache();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search users when search type is 'users'
  useEffect(() => {
    if (searchType !== 'users' || !debouncedSearch.trim() || !user?.id) {
      setUserSearchResults([]);
      return;
    }

    const searchForUsers = async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(debouncedSearch, user.id);
        setUserSearchResults(results);
      } catch (error) {
        console.error('User search error:', error);
      } finally {
        setSearchingUsers(false);
      }
    };

    searchForUsers();
  }, [debouncedSearch, searchType, user?.id]);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPosts();
      setAllPosts(data);
      // Cache the fresh data
      await cachePosts(data);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrendingTags = useCallback(async () => {
    try {
      const tags = await getTrendingHashtags();
      setTrendingTags(tags);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchTrendingTags();
  }, [fetchPosts, fetchTrendingTags]);

  // Firebase real-time listener
  useEffect(() => {
    const unsubscribe = subscribeToPostsRealtime(async (updatedPosts) => {
      setAllPosts(updatedPosts);
      setLoading(false);
      setLoadedFromCache(false);
      // Update cache with fresh data
      await cachePosts(updatedPosts);
      fetchTrendingTags();
    });
    return () => unsubscribe();
  }, [fetchTrendingTags]);

  // Handle openPulseUpload from state
  useEffect(() => {
    if (location.state?.openPulseUpload) {
      setShowCreate(true);
      // We'll pass a prop to CreatePostModal to switch to Pulse tab
    }
  }, [location.state]);

  // Client-side fast filtering: by tab AND search query
  const filteredPosts = useMemo(() => {
    let posts = allPosts.filter(p => p.type === activeTab);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      posts = posts.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.author_username?.toLowerCase().includes(q) ||
        (p.hashtags || []).some(t => t.toLowerCase().includes(q.replace('#', '')))
      );
    }
    return posts;
  }, [allPosts, activeTab, debouncedSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setUserSearchResults([]);
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
  };

  const handlePostCreated = () => {
    setShowCreate(false);
    fetchTrendingTags();
  };

  const handlePostDeleted = useCallback((postId) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handlePostUpdated = useCallback((updatedPost) => {
    setAllPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }, []);

  const handleVoteChanged = useCallback((postId, voteData) => {
    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvote_count: voteData.upvote_count, downvote_count: voteData.downvote_count, votes: voteData.votes } : p
      )
    );
  }, []);

  if (pageLoading) {
    return <LoadingScreen message="Loading your feed..." />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212] pb-28">
      <Header />
      
      {isOffline && (
        <div data-testid="offline-banner" className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[#F59E0B] text-[13px] font-medium">You're offline. Showing cached content.</span>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 pb-32">
        {/* Signal Stories Row */}
        {user && <SignalStoriesRow />}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          
          {/* Left Column - Main Feed Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs */}
            <div data-testid="feed-tabs" className="flex mb-4 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[12px] p-1 border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
              <button
                data-testid="tab-discussion"
                onClick={() => setActiveTab('discussion')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all ${
                  activeTab === 'discussion'
                    ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-button'
                    : 'text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Discussions
              </button>
              <button
                data-testid="tab-project"
                onClick={() => setActiveTab('project')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all ${
                  activeTab === 'project'
                    ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-button'
                    : 'text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                Project Posts
              </button>
              {user && (
                <button
                  data-testid="tab-pulse"
                  onClick={() => navigate('/pulse')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]`}
                >
                  <PlayCircle className="w-4 h-4 text-[#EF4444]" />
                  Pulse
                </button>
              )}
            </div>

            {/* Search bar and View Mode Segment Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 mb-6">
              {/* Search Pane */}
              <div className="flex-1 flex flex-col">
                {/* Search type toggle */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => { setSearchType('posts'); setUserSearchResults([]); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all ${
                      searchType === 'posts'
                        ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#1a1a1a] text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-neutral-200 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    Posts
                  </button>
                  <button
                    onClick={() => setSearchType('users')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all ${
                      searchType === 'users'
                        ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#1a1a1a] text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-neutral-200 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    Users
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]" />
                  <Input
                    data-testid="feed-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchType === 'users' ? 'Search users by username...' : `Search ${activeTab === 'discussion' ? 'discussions' : 'projects'}...`}
                    className="pl-10 pr-10 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 discuss:placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 rounded-[6px] text-[13px] md:text-[15px] h-10 shadow-card"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      data-testid="feed-search-clear"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white discuss:hover:text-[#F5F5F5]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* View Mode Segment Switcher (List Feed vs Swipe Deck) */}
              {searchType === 'posts' && (
                <div className="flex items-center bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[12px] p-1 shadow-card h-10 shrink-0 self-stretch sm:self-end">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`h-full px-3 rounded-[8px] text-[12.5px] font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'list'
                        ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white discuss:text-[#9CA3AF] discuss:hover:text-white'
                    }`}
                    title="List Feed"
                  >
                    <Layers className="w-3.5 h-3.5 rotate-90" />
                    <span>List View</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('slide');
                      // Sync index
                      const saved = sessionStorage.getItem(`discuss_slide_index_${activeTab}`);
                      setSlideIndex(saved ? parseInt(saved, 10) : 0);
                    }}
                    className={`h-full px-3 rounded-[8px] text-[12.5px] font-bold transition-all flex items-center gap-1.5 ${
                      viewMode === 'slide'
                        ? 'bg-[#2563EB] discuss:bg-[#EF4444] text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white discuss:text-[#9CA3AF] discuss:hover:text-white'
                    }`}
                    title="Slide View"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Slide View</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Search Results */}
            {searchType === 'users' && debouncedSearch && (
              <div className="mb-4">
                {searchingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
                  </div>
                ) : userSearchResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-xs mb-2">
                      {userSearchResults.length} user{userSearchResults.length !== 1 ? 's' : ''} found
                    </p>
                    {userSearchResults.map((searchUser) => (
                      <UserSearchResult
                        key={searchUser.id}
                        user={searchUser}
                        currentUserId={user?.id}
                        onClose={() => {}}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[12px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
                    <Users className="w-8 h-8 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm">
                      No users found for "{debouncedSearch}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Active search indicator for posts */}
            {searchType === 'posts' && debouncedSearch && (
              <div data-testid="active-search-badge" className="flex items-center gap-2 mb-4 bg-[#2563EB]/10 dark:bg-[#2563EB]/15 border border-[#2563EB]/20 dark:border-[#2563EB]/30 rounded-[6px] px-3 py-2">
                <Search className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-[#2563EB] text-[13px] font-medium">
                  {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} for "{debouncedSearch}" in {activeTab === 'discussion' ? 'Discussions' : 'Projects'}
                </span>
                <button onClick={handleClearSearch} className="ml-auto text-[#2563EB] hover:text-[#1D4ED8]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Trending hashtags - only show when not searching users (Responsive: hidden on desktop, visible on mobile) */}
            {searchType === 'posts' && trendingTags.length > 0 && !debouncedSearch && (
              <div data-testid="trending-tags" className="mb-5 lg:hidden animate-fade-in">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]" />
                  <span className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">Trending</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trendingTags.slice(0, 4).map((t) => (
                    <button
                      key={t.tag}
                      data-testid={`trending-tag-${t.tag}`}
                      onClick={() => handleTagClick(t.tag)}
                      className="inline-flex items-center gap-1 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 dark:hover:bg-[#2563EB]/10 rounded-[6px] px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:text-[#2563EB] transition-all shadow-card"
                    >
                      <Hash className="w-3 h-3" />
                      {t.tag}
                      <span className="text-[10px] opacity-60">({t.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Posts - only show when not searching users */}
            {searchType === 'posts' && (
              loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] discuss:text-[#EF4444] mb-2" />
                  <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm">Loading posts...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div data-testid="empty-feed" className="text-center py-20">
                  <div className="w-16 h-16 rounded-[12px] bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'discussion' ? (
                      <MessageSquare className="w-7 h-7 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]" />
                    ) : (
                      <FolderGit2 className="w-7 h-7 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-1">
                    {debouncedSearch ? 'No results found' : `No ${activeTab === 'discussion' ? 'discussions' : 'projects'} yet`}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-[13px] md:text-[15px]">
                    {debouncedSearch ? `Try a different search term` : `Be the first to start a ${activeTab === 'discussion' ? 'discussion' : 'project post'}!`}
                  </p>
                </div>
              ) : viewMode === 'slide' ? (
                /* Slide View (Tinder-style deck) */
                <div className="space-y-6">
                  {slideIndex >= filteredPosts.length ? (
                    /* End of Feed Card */
                    <div className="w-full max-w-xl mx-auto bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-8 shadow-card text-center animate-fade-in">
                      <div className="w-20 h-20 rounded-full bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-6 relative">
                        <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-[#2563EB]/30 discuss:bg-[#EF4444]/30 opacity-75"></span>
                        <Layers className="w-8 h-8 text-[#2563EB] discuss:text-[#EF4444]" />
                      </div>

                      <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-50 discuss:text-white mb-2 uppercase tracking-wide">
                        End of Feed Reached
                      </h3>
                      
                      <p className="text-[13px] md:text-[14px] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] max-w-sm mx-auto mb-8 font-medium">
                        You've caught up with all {activeTab === 'discussion' ? 'discussions' : 'project posts'} for now. Swipe back or explore active developer tools!
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                          onClick={handleStartOver}
                          className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white font-bold text-[13px] gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Start Over</span>
                        </Button>

                        <Button
                          onClick={() => setViewMode('list')}
                          variant="outline"
                          className="w-full sm:w-auto h-10 px-5 rounded-xl border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] font-bold text-[13px] gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]"
                        >
                          <span>Switch to List View</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Swipeable Deck container */
                    <div className="relative w-full max-w-xl mx-auto min-h-[420px] pb-6">
                      {/* Underneath Card 2 (Deck depth) */}
                      {slideIndex + 2 < filteredPosts.length && (
                        <div className="absolute inset-0 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[12px] shadow-card opacity-40 transform scale-[0.92] translate-y-6 pointer-events-none -z-20 transition-all duration-300" />
                      )}
                      
                      {/* Underneath Card 1 (Deck depth) */}
                      {slideIndex + 1 < filteredPosts.length && (
                        <div className="absolute inset-0 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[12px] shadow-card opacity-75 transform scale-[0.96] translate-y-3 pointer-events-none -z-10 transition-all duration-300" />
                      )}

                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={filteredPosts[slideIndex].id}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          onDragEnd={handleDragEnd}
                          style={{ x, rotate, opacity }}
                          initial={{ scale: 0.95, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ 
                            x: swipeDirection === 'left' ? -400 : 400, 
                            opacity: 0, 
                            rotate: swipeDirection === 'left' ? -30 : 30,
                            transition: { duration: 0.3 }
                          }}
                          whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="w-full relative z-10"
                        >
                          <MemoPostCard
                            post={filteredPosts[slideIndex]}
                            currentUser={user}
                            onDeleted={handlePostDeleted}
                            onUpdated={handlePostUpdated}
                            onVoteChanged={handleVoteChanged}
                            onTagClick={handleTagClick}
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Controls bar below active deck card */}
                      <div className="flex items-center justify-between mt-8 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[16px] p-3 shadow-card animate-fade-in relative z-20">
                        <Button
                          onClick={handleStartOver}
                          variant="outline"
                          className="h-10 rounded-[10px] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-[12.5px] font-bold gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF]"
                          title="Start Over"
                        >
                          <RotateCcw className="w-4 h-4 text-neutral-500 discuss:text-[#9CA3AF]" />
                          <span className="hidden sm:inline">Start Over</span>
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handlePrev}
                            disabled={slideIndex === 0}
                            variant="outline"
                            className="h-10 w-10 p-0 rounded-[10px] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] disabled:opacity-40 text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF]"
                            title="Previous Post"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </Button>

                          <span className="text-[12.5px] font-bold font-mono text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] px-2 select-none shrink-0">
                            {slideIndex + 1} / {filteredPosts.length}
                          </span>

                          <Button
                            onClick={() => {
                              setSwipeDirection('right');
                              handleNext();
                            }}
                            variant="outline"
                            className="h-10 rounded-[10px] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-[12.5px] font-bold gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF]"
                            title="Skip Post"
                          >
                            <span>Skip</span>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* List View (Standard scroll list) */
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <MemoPostCard
                      key={post.id}
                      post={post}
                      currentUser={user}
                      onDeleted={handlePostDeleted}
                      onUpdated={handlePostUpdated}
                      onVoteChanged={handleVoteChanged}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>
              )
            )}
          </div>

          {/* Right Column - Desktop Sidebar (Sticky) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-20 space-y-6 animate-fade-in">
              
              {/* Trending Card */}
              {trendingTags.length > 0 && (
                <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#262626]">
                    <TrendingUp className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                      Trending Hashtags
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {trendingTags.slice(0, 6).map((t) => (
                      <button
                        key={t.tag}
                        onClick={() => handleTagClick(t.tag)}
                        className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 discuss:bg-black/30 hover:bg-[#2563EB]/5 dark:hover:bg-[#2563EB]/10 border border-transparent hover:border-[#2563EB]/20 text-[13px] font-medium text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] transition-all duration-150"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Hash className="w-3.5 h-3.5 opacity-60 shrink-0" />
                          <span className="truncate">{t.tag}</span>
                        </span>
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-800 discuss:bg-[#262626] px-2 py-0.5 rounded-md opacity-70 border border-neutral-200/50 dark:border-neutral-700/50 discuss:border-white/5 shrink-0 font-mono">
                          {t.count} posts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Status Card */}
              <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#262626]">
                  <Cpu className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                    System Status
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Pulsing Status indicator */}
                  <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/10 rounded-lg p-2.5">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[12px] font-mono font-bold text-green-600 dark:text-green-400">
                      discuss_network: active
                    </span>
                  </div>

                  {/* Tech Metrics */}
                  <div className="space-y-2 text-xs font-mono border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] pb-4">
                    <div className="flex justify-between">
                      <span className="text-neutral-400 dark:text-neutral-500">Uptime:</span>
                      <span className="text-neutral-700 dark:text-neutral-300 discuss:text-[#F5F5F5] font-semibold">99.98%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400 dark:text-neutral-500">Latency:</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">12ms (api_edge)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400 dark:text-neutral-500">Active Nodes:</span>
                      <span className="text-neutral-700 dark:text-neutral-300 discuss:text-[#F5F5F5] font-semibold font-mono">4 [Stable]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400 dark:text-neutral-500">Gateways:</span>
                      <span className="text-[#2563EB] discuss:text-[#EF4444] font-semibold">Firebase, Brevo</span>
                    </div>
                  </div>

                  {/* Developer Logs Guidelines */}
                  <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/50 discuss:bg-black/35 border border-neutral-100 dark:border-neutral-800/60 discuss:border-[#262626] rounded-lg p-3 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]">
                    <div className="text-neutral-500 dark:text-neutral-600 font-bold select-none mb-1">◈ SYSTEM_LOGS:</div>
                    <div>// keep discussion constructive</div>
                    <div>// flag violations via CPU menu</div>
                    <div>// share builds under #project</div>
                    <div className="text-[#2563EB] discuss:text-[#EF4444]/80">// discuss_version: v2.4-stable</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <CreatePostModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handlePostCreated}
      />
    </div>
  );
}
