import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { searchPosts } from '@/lib/db';
import { searchUsers } from '@/lib/relationshipsDb';
import { ArrowLeft, FileText, Search, Users, X, Loader2, Hash, ChevronRight, Home } from 'lucide-react';

const tabs = [
  { id: 'all', label: 'Top' },
  { id: 'posts', label: 'Discussions' },
  { id: 'people', label: 'People' },
];

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);

  const normalizedQuery = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setPosts([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [postResults, userResults] = await Promise.all([
          searchPosts(normalizedQuery, 20),
          searchUsers(normalizedQuery, user?.id || user?.uid),
        ]);
        if (requestRef.current !== requestId) return;
        setPosts(postResults);
        setPeople(userResults);
      } catch {
        if (requestRef.current === requestId) {
          setPosts([]);
          setPeople([]);
        }
      } finally {
        if (requestRef.current === requestId) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [normalizedQuery, user?.id, user?.uid]);

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showPeople = activeTab === 'all' || activeTab === 'people';
  const resultCount = useMemo(() => posts.length + people.length, [posts.length, people.length]);

  return (
    <div className="min-h-screen bg-white pb-28 dark:bg-black">
      <Header />
      <main className="mx-auto w-full max-w-[680px]">
        <div className="sticky top-12 z-30 border-b border-[#EFEFEF] bg-white/95 px-4 pb-3 pt-4 backdrop-blur-xl dark:border-[#262626] dark:bg-black/95 lg:top-14">
          <div className="mb-4 flex items-center gap-3">
            <button onClick={() => navigate('/feed')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[20px] font-bold leading-tight text-neutral-900 dark:text-white">Search Discuss</h1>
              <p className="text-[12px] text-neutral-500">Find people, discussions, projects, and tags</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search discussions or people"
              className="h-12 w-full rounded-2xl border border-transparent bg-[#EFEFEF] pl-11 pr-11 text-[15px] text-neutral-900 outline-none transition-all placeholder:text-neutral-500 focus:border-[#0095F6]/30 focus:bg-white focus:ring-4 focus:ring-[#0095F6]/10 dark:bg-[#1A1A1A] dark:text-white dark:focus:bg-black"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-300 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-1 rounded-xl bg-[#F7F7F7] p-1 dark:bg-[#121212]">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm dark:bg-[#262626] dark:text-white' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          {!normalizedQuery && (
            <div className="flex min-h-[46vh] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0095F6]/10 text-[#0095F6]"><Search className="h-7 w-7" /></div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Discover what matters</h2>
              <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-neutral-500">Search by username, post title, content, project type, or hashtag.</p>
              <Link to="/feed" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0095F6] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1877F2]"><Home className="h-4 w-4" /> Go to home</Link>
            </div>
          )}

          {normalizedQuery && normalizedQuery.length < 2 && <p className="py-12 text-center text-[13px] text-neutral-500">Enter at least two characters to search.</p>}

          {loading && <div className="flex items-center justify-center gap-2 py-14 text-[13px] font-medium text-neutral-500"><Loader2 className="h-4 w-4 animate-spin text-[#0095F6]" /> Searching Discuss…</div>}

          {!loading && normalizedQuery.length >= 2 && resultCount === 0 && (
            <div className="py-16 text-center"><p className="font-semibold text-neutral-900 dark:text-white">No results found</p><p className="mt-1 text-[13px] text-neutral-500">Try a different name, phrase, or hashtag.</p></div>
          )}

          {!loading && showPeople && people.length > 0 && (
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[13px] font-bold text-neutral-900 dark:text-white"><Users className="h-4 w-4" /> People</h2><span className="text-[11px] text-neutral-400">{people.length}</span></div>
              <div className="overflow-hidden rounded-2xl border border-[#EFEFEF] dark:border-[#262626]">
                {people.map((person) => (
                  <Link key={person.id} to={`/user/${person.id}`} className="flex items-center gap-3 border-b border-[#EFEFEF] px-4 py-3.5 transition-colors last:border-0 hover:bg-[#FAFAFA] dark:border-[#262626] dark:hover:bg-[#0A0A0A]">
                    <UserAvatar src={person.photo_url} username={person.username} className="h-11 w-11 rounded-full object-cover" />
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-bold text-neutral-900 dark:text-white">{person.username}</span>{person.verified && <VerifiedBadge size="sm" />}</div><p className="truncate text-[12px] text-neutral-500">View developer profile</p></div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!loading && showPosts && posts.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[13px] font-bold text-neutral-900 dark:text-white"><FileText className="h-4 w-4" /> Discussions & projects</h2><span className="text-[11px] text-neutral-400">{posts.length}</span></div>
              <div className="overflow-hidden rounded-2xl border border-[#EFEFEF] dark:border-[#262626]">
                {posts.map((post) => (
                  <Link key={post.id} to={`/post/${post.id}`} className="block border-b border-[#EFEFEF] px-4 py-4 transition-colors last:border-0 hover:bg-[#FAFAFA] dark:border-[#262626] dark:hover:bg-[#0A0A0A]">
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-neutral-500"><span className="font-semibold text-neutral-700 dark:text-neutral-300">@{post.author_username || 'developer'}</span><span>·</span><span className="capitalize">{post.type || 'discussion'}</span></div>
                    <h3 className="line-clamp-1 text-[14px] font-bold text-neutral-900 dark:text-white">{post.title || post.content || 'Untitled discussion'}</h3>
                    {post.title && post.content && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">{post.content}</p>}
                    {post.hashtags?.length > 0 && <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#0095F6]"><Hash className="h-3 w-3" />{post.hashtags.slice(0, 3).join('  #')}</div>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
