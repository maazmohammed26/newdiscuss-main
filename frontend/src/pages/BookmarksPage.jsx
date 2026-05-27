import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPosts } from '@/lib/db';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import LoadingScreen from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { 
  Bookmark, 
  Trash2, 
  CheckSquare, 
  Square, 
  ChevronLeft, 
  Loader2, 
  Cpu, 
  Activity, 
  Info,
  Layers,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch all posts and filter locally based on stored bookmark IDs for user
  const loadBookmarks = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const key = `discuss_bookmarks_${user.id}`;
      const bookmarkIds = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (bookmarkIds.length === 0) {
        setBookmarkedPosts([]);
        setLoading(false);
        return;
      }

      const posts = await getPosts();
      setAllPosts(posts);
      
      // Filter posts that are bookmarked
      const filtered = posts.filter(p => bookmarkIds.includes(p.id));
      setBookmarkedPosts(filtered);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
      toast.error('Failed to sync bookmarks');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookmarks();
    // Listen for custom bookmark toggle events to sync lists in real time
    window.addEventListener('discuss_bookmarks_updated', loadBookmarks);
    return () => window.removeEventListener('discuss_bookmarks_updated', loadBookmarks);
  }, [loadBookmarks]);

  // Toggle selection for a single post in bulk mode
  const handleSelectToggle = (postId) => {
    setSelectedIds(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId) 
        : [...prev, postId]
    );
  };

  // Select all bookmarked posts
  const handleSelectAll = () => {
    if (selectedIds.length === bookmarkedPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bookmarkedPosts.map(p => p.id));
    }
  };

  // Delete selected bookmarks
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    try {
      const key = `discuss_bookmarks_${user.id}`;
      let bookmarkIds = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Filter out selected IDs
      bookmarkIds = bookmarkIds.filter(id => !selectedIds.includes(id));
      localStorage.setItem(key, JSON.stringify(bookmarkIds));
      
      toast.success(`Removed ${selectedIds.length} bookmark${selectedIds.length !== 1 ? 's' : ''}`);
      
      setSelectedIds([]);
      setIsSelectMode(false);
      
      // Force sync event
      window.dispatchEvent(new Event('discuss_bookmarks_updated'));
    } catch (e) {
      toast.error('Failed to remove selected bookmarks');
    }
  };

  // Clear all bookmarks
  const handleClearAll = () => {
    try {
      const key = `discuss_bookmarks_${user.id}`;
      localStorage.setItem(key, JSON.stringify([]));
      toast.success('Cleared all bookmarks successfully');
      setIsSelectMode(false);
      setSelectedIds([]);
      
      window.dispatchEvent(new Event('discuss_bookmarks_updated'));
    } catch (e) {
      toast.error('Failed to clear bookmarks');
    }
  };

  // Callback to sync items if post deleted inside bookmark page
  const handlePostDeleted = (postId) => {
    setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
    try {
      const key = `discuss_bookmarks_${user.id}`;
      let bookmarkIds = JSON.parse(localStorage.getItem(key) || '[]');
      bookmarkIds = bookmarkIds.filter(id => id !== postId);
      localStorage.setItem(key, JSON.stringify(bookmarkIds));
      window.dispatchEvent(new Event('discuss_bookmarks_updated'));
    } catch (e) {}
  };

  // Metrics computation for sticky tech sidebar
  const discussionCount = bookmarkedPosts.filter(p => p.type === 'discussion').length;
  const projectCount = bookmarkedPosts.filter(p => p.type === 'project').length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 discuss:bg-[#121212] pb-28">
      <Header />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 pb-32">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => navigate('/feed')}
            className="flex items-center gap-1 text-[13px] font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Feed
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Main Bookmarks Content */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800 discuss:border-[#262626]">
              <div>
                <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 discuss:text-white flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-yellow-500 fill-current" />
                  <span>Bookmarks</span>
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1 font-medium">
                  {bookmarkedPosts.length} saved post{bookmarkedPosts.length !== 1 ? 's' : ''} in your local cache
                </p>
              </div>

              {bookmarkedPosts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Select Mode Toggle */}
                  <Button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      setSelectedIds([]);
                    }}
                    variant="outline"
                    className="h-9 rounded-[8px] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-[12px] font-bold gap-1.5"
                  >
                    {isSelectMode ? (
                      <>Cancel Select</>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        Select & Remove
                      </>
                    )}
                  </Button>

                  {/* Clear All Button */}
                  <Button
                    onClick={handleClearAll}
                    variant="destructive"
                    className="h-9 rounded-[8px] bg-red-500 hover:bg-red-600 text-white text-[12px] font-bold gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* Sliding Local Cache Notice Banner */}
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
              className="flex items-start gap-3 p-4 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/25 dark:border-yellow-500/20 discuss:border-yellow-500/15 rounded-xl shadow-sm text-yellow-600 dark:text-yellow-400 discuss:text-yellow-400 font-mono text-[11px] md:text-xs select-none"
            >
              <Info className="w-4 h-4 text-yellow-500 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold uppercase tracking-wider">◈ LOCAL_STORAGE ACTIVE:</span>{' '}
                Bookmarks are persisted securely in your browser's local cache. No data is stored on remote servers or databases, ensuring O(1) performance and 100% privacy.
              </div>
            </motion.div>

            {/* Bulk Selection Actions Panel */}
            {isSelectMode && bookmarkedPosts.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-500/5 dark:bg-yellow-500/10 border border-yellow-500/20 dark:border-yellow-500/30 rounded-xl animate-fade-in">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] hover:text-[#2563EB]"
                  >
                    {selectedIds.length === bookmarkedPosts.length ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-yellow-500 fill-current" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        Select All ({selectedIds.length}/{bookmarkedPosts.length})
                      </>
                    )}
                  </button>
                </div>
                
                <Button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0}
                  className="h-8 rounded-[6px] bg-red-500 hover:bg-red-600 text-white font-bold text-xs gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Selected ({selectedIds.length})
                </Button>
              </div>
            )}

            {/* Bookmarks List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#2563EB] discuss:text-[#EF4444] mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-sm">Synchronizing bookmarks...</p>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-[16px] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
                <div className="w-16 h-16 rounded-[12px] bg-neutral-100 dark:bg-neutral-900 discuss:bg-[#121212] flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
                  <Bookmark className="w-7 h-7 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 discuss:text-white mb-1.5">No bookmarks saved</h3>
                <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] text-[13px] md:text-[15px] max-w-sm mx-auto">
                  Browse the developer feed and tap the bookmark icon on any post to persist it inside your drawer hub.
                </p>
                <Button 
                  onClick={() => navigate('/feed')}
                  className="mt-6 bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white rounded-xl py-2.5 h-10 font-bold px-5"
                >
                  Explore Feed
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarkedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={user}
                    onDeleted={handlePostDeleted}
                    onUpdated={loadBookmarks}
                    onVoteChanged={loadBookmarks}
                    isSelectable={isSelectMode}
                    isSelected={selectedIds.includes(post.id)}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Desktop Sticky Bookmarks Stats */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-20 space-y-6">
              
              {/* Stats Card */}
              <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#262626]">
                  <Activity className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                    Storage Analytics
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400 dark:text-neutral-500">Node Storage:</span>
                    <span className="text-green-500 font-bold font-mono">O(1) LocalStorage</span>
                  </div>

                  {/* Discussions count */}
                  <div className="flex items-center justify-between text-xs font-mono border-t border-neutral-100 dark:border-neutral-800/80 discuss:border-white/5 pt-2">
                    <span className="text-neutral-400 dark:text-neutral-500">Discussions:</span>
                    <span className="text-neutral-700 dark:text-neutral-300 discuss:text-white font-bold">{discussionCount} posts</span>
                  </div>

                  {/* Projects count */}
                  <div className="flex items-center justify-between text-xs font-mono border-t border-neutral-100 dark:border-neutral-800/80 discuss:border-white/5 pt-2">
                    <span className="text-neutral-400 dark:text-neutral-500">Projects:</span>
                    <span className="text-neutral-700 dark:text-neutral-300 discuss:text-white font-bold">{projectCount} posts</span>
                  </div>

                  {/* Storage utilization */}
                  <div className="flex items-center justify-between text-xs font-mono border-t border-neutral-100 dark:border-neutral-800/80 discuss:border-white/5 pt-2">
                    <span className="text-neutral-400 dark:text-neutral-500">Cache Limit:</span>
                    <span className="text-neutral-500 dark:text-neutral-500 font-bold">5MB (Unlimited Node)</span>
                  </div>
                </div>
              </div>

              {/* Security Watermark System */}
              <div className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700/50 discuss:border-[#262626]">
                  <Cpu className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 discuss:text-[#9CA3AF]">
                    Watermark Node
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                    </span>
                    <span className="text-[12px] font-mono font-bold text-yellow-600 dark:text-yellow-400">
                      discuss_bookmarks: synchronized
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/50 discuss:bg-black/35 border border-neutral-100 dark:border-neutral-800/60 discuss:border-[#262626] rounded-lg p-3 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]">
                    <div className="text-neutral-500 dark:text-neutral-600 font-bold select-none mb-1">◈ CACHE_STATUS:</div>
                    <div>// saved per browser local session</div>
                    <div>// user uid bound indexing active</div>
                    <div className="text-[#2563EB] discuss:text-[#EF4444] font-bold">&lt;discuss_watermark/&gt;</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
