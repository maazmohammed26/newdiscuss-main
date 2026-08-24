import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPosts } from '@/lib/db';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PostCard from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { 
  Bookmark, 
  Trash2, 
  CheckSquare, 
  Square, 
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-white pb-28 text-neutral-950 dark:bg-black dark:text-white">
      <Header />

      <div className="mx-auto w-full max-w-[1180px] px-0 pb-32 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,680px)] lg:justify-center">
          <Sidebar />
          
          <main className="min-w-0 border-x border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-col gap-4 border-b border-neutral-200 px-4 py-6 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <Bookmark className="h-6 w-6" />
                  <span>Saved posts</span>
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {bookmarkedPosts.length} post{bookmarkedPosts.length !== 1 ? 's' : ''} saved for later
                </p>
              </div>

              {bookmarkedPosts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      setIsSelectMode(!isSelectMode);
                      setSelectedIds([]);
                    }}
                    variant="outline"
                    className="h-9 gap-1.5 rounded-lg border-neutral-200 bg-white text-xs font-semibold dark:border-neutral-700 dark:bg-black"
                  >
                    {isSelectMode ? (
                      <>Cancel Select</>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        Select
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleClearAll}
                    variant="ghost"
                    className="h-9 gap-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {isSelectMode && bookmarkedPosts.length > 0 && (
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-[#0095F6] dark:text-neutral-300"
                  >
                    {selectedIds.length === bookmarkedPosts.length ? (
                      <>
                        <CheckSquare className="h-4 w-4 text-[#0095F6]" />
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
                  className="h-8 gap-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Selected ({selectedIds.length})
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#0095F6]" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading saved posts…</p>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="px-6 py-24 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-900 dark:border-white">
                  <Bookmark className="h-9 w-9" />
                </div>
                <h3 className="mb-1.5 text-xl font-bold">Save what inspires you</h3>
                <p className="mx-auto max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                  Posts you bookmark will appear here so you can find them quickly.
                </p>
                <Button 
                  onClick={() => navigate('/feed')}
                  className="mt-6 h-10 rounded-lg bg-[#0095F6] px-5 font-semibold text-white hover:bg-[#1877F2]"
                >
                  Explore Feed
                </Button>
              </div>
            ) : (
              <div>
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
          </main>
        </div>
      </div>
    </div>
  );
}
