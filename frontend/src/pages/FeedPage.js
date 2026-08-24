import { useState, useEffect, useCallback, useMemo, useRef, startTransition, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToPostsRealtime } from '@/lib/db';
import { cachePosts, getFastCachedPosts } from '@/lib/cacheManager';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';
import SignalStoriesRow from '@/components/SignalStoriesRow';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WifiOff, 
  Loader2, 
  MessageSquare, 
  FolderGit2, 
  TrendingUp, 
  Hash, 
  Cpu
} from 'lucide-react';

const MemoPostCard = memo(PostCard);

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initialPostsRef = useRef(getFastCachedPosts());
  const [allPosts, setAllPosts] = useState(() => initialPostsRef.current || []);
  const [loading, setLoading] = useState(() => initialPostsRef.current === null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState('discussion');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPostsRealtime(async (updatedPosts) => {
      startTransition(() => setAllPosts(updatedPosts));
      setLoading(false);
      await cachePosts(updatedPosts);
    });
    return () => unsubscribe();
  }, []);

  const filteredPosts = useMemo(() => {
    return allPosts.filter(p => p.type === activeTab);
  }, [allPosts, activeTab]);

  const trendingTags = useMemo(() => {
    const tagCounts = {};
    allPosts.forEach(p => {
      if (Array.isArray(p.hashtags)) {
        p.hashtags.forEach(tag => {
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allPosts]);

  const handlePostCreated = () => {
    setShowCreate(false);
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

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white pb-24">
      <Header />
      
      {isOffline && (
        <div data-testid="offline-banner" className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[#F59E0B] text-[13px] font-medium">You're offline. Showing cached content.</span>
        </div>
      )}

      <div className="w-full max-w-5xl lg:max-w-[1240px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_600px_300px] justify-center gap-6">
          
          {/* Left Sidebar (Desktop Only) */}
          <Sidebar onPostCreated={handlePostCreated} />

          {/* Main Instagram Stream (Centered) */}
          <main className="w-full max-w-[600px] mx-auto min-w-0 flex-1">
            {/* Instagram Story Tray */}
            {user && <SignalStoriesRow />}

            {/* Discussions / Projects Tabs */}
            <div className="flex items-center justify-center gap-8 py-2.5 border-b border-[#EFEFEF] dark:border-[#262626] mb-2 bg-white dark:bg-black">
              <button
                onClick={() => setActiveTab('discussion')}
                className={`text-[13px] font-bold pb-1 cursor-pointer transition-colors relative ${
                  activeTab === 'discussion'
                    ? 'text-neutral-950 dark:text-white'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <span>Discussions</span>
                {activeTab === 'discussion' && (
                  <span className="absolute bottom-[-10px] left-0 w-full h-[2px] bg-neutral-950 dark:bg-white" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('project')}
                className={`text-[13px] font-bold pb-1 cursor-pointer transition-colors relative ${
                  activeTab === 'project'
                    ? 'text-neutral-950 dark:text-white'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
              >
                <span>Projects</span>
                {activeTab === 'project' && (
                  <span className="absolute bottom-[-10px] left-0 w-full h-[2px] bg-neutral-950 dark:bg-white" />
                )}
              </button>
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#0095F6] mb-2" />
                <p className="text-neutral-400 text-sm">Loading feed...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-3">
                  {activeTab === 'discussion' ? (
                    <MessageSquare className="w-6 h-6 text-neutral-400" />
                  ) : (
                    <FolderGit2 className="w-6 h-6 text-neutral-400" />
                  )}
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                  No {activeTab === 'discussion' ? 'discussions' : 'projects'} yet
                </h3>
                <p className="text-xs text-neutral-400">
                  Be the first to share a post with the community!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredPosts.map((post) => (
                  <MemoPostCard
                    key={post.id}
                    post={post}
                    currentUser={user}
                    onDeleted={handlePostDeleted}
                    onUpdated={handlePostUpdated}
                    onVoteChanged={handleVoteChanged}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar (Desktop Only) */}
          <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[72px] self-start space-y-6">
            {trendingTags.length > 0 && (
              <div className="bg-white dark:bg-black border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#EFEFEF] dark:border-[#262626]">
                  <TrendingUp className="w-4 h-4 text-[#0095F6]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Trending Topics
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  {trendingTags.map((t) => (
                    <div
                      key={t.tag}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 text-xs font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                        <Hash className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{t.tag}</span>
                      </span>
                      <span className="text-[11px] text-neutral-400">{t.count} posts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-black border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#EFEFEF] dark:border-[#262626]">
                <Cpu className="w-4 h-4 text-[#0095F6]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Discuss Network
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-500 font-bold">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </aside>

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
