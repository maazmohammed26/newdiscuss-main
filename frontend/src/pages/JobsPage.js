import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToJobs, deleteJob } from '@/lib/firebaseSixth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import JobAdminModal from '@/components/JobAdminModal';
import ItemShareModal from '@/components/ItemShareModal';
import GuestApplyPopup from '@/components/GuestApplyPopup';
import ExpandableText from '@/components/ExpandableText';
import LinkifiedText from '@/components/LinkifiedText';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Share2, Pencil, Trash2, ShieldCheck, Briefcase, Building, MapPin, Calendar, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Shimmer skeleton primitives ─────────────────────────────────────────── */
const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#2a2a2a] ${className}`} />
);

function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] rounded-3xl border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] p-5 md:p-6 space-y-4 overflow-hidden relative">
      {/* shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent pointer-events-none" />
      {/* badges row */}
      <div className="flex gap-2">
        <Shimmer className="h-5 w-14" />
        <Shimmer className="h-5 w-20" />
        <Shimmer className="h-5 w-16" />
      </div>
      {/* title + button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Shimmer className="h-7 w-3/4" />
          <Shimmer className="h-4 w-1/3" />
        </div>
        <Shimmer className="h-9 w-24 rounded-xl shrink-0" />
      </div>
      {/* meta row */}
      <div className="flex flex-wrap gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#222]">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-24" />
      </div>
      {/* description */}
      <div className="space-y-2">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-5/6" />
        <Shimmer className="h-3.5 w-4/6" />
      </div>
      {/* footer */}
      <div className="flex justify-between pt-2">
        <div className="flex gap-2">
          <Shimmer className="h-9 w-24 rounded-xl" />
          <Shimmer className="h-9 w-28 rounded-xl" />
        </div>
        <Shimmer className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Marquee (memoised to avoid re-render) ───────────────────────────────── */
const MarqueeBar = () => (
  <div className="w-full bg-[#FEF2F2]/60 dark:bg-red-950/20 discuss:bg-[#1E1B1B] border-b border-red-100 dark:border-red-900/30 discuss:border-red-950 py-2.5 overflow-hidden relative select-none z-20">
    <div className="absolute inset-y-0 left-0 w-8 md:w-20 bg-gradient-to-r from-[#F5F5F7] dark:from-[#0F172A] discuss:from-[#121212] to-transparent z-10 pointer-events-none" />
    <div className="absolute inset-y-0 right-0 w-8 md:w-20 bg-gradient-to-l from-[#F5F5F7] dark:from-[#0F172A] discuss:from-[#121212] to-transparent z-10 pointer-events-none" />
    <style>{`
      @keyframes marquee { 0%{transform:translateX(0%)} 100%{transform:translateX(-50%)} }
      @keyframes shimmer { 100%{transform:translateX(200%)} }
      .animate-marquee { display:flex; width:max-content; animation:marquee 35s linear infinite; }
      .animate-marquee:hover { animation-play-state:paused; }
    `}</style>
    <div className="animate-marquee gap-8">
      <div className="flex items-center gap-2 text-xs font-mono tracking-tight font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]">
        <span className="text-[9px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">BETA</span>
        <span>This is a beta version which is under development but you can use it in live prod.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-[#0095F6] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">MANAGED</span>
        <span>Currently both sections are handled by the Discuss Team directly.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">COMING SOON</span>
        <span>Companies and organizations can also directly add events and listings!</span>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono tracking-tight font-medium text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]" aria-hidden="true">
        <span className="text-[9px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">BETA</span>
        <span>This is a beta version which is under development but you can use it in live prod.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-[#0095F6] text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">MANAGED</span>
        <span>Currently both sections are handled by the Discuss Team directly.</span>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-2 animate-ping" />
        <span className="text-[9px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider font-sans">COMING SOON</span>
        <span>Companies and organizations can also directly add events and listings!</span>
      </div>
    </div>
  </div>
);

const FILTERS = ['All', 'Jobs', 'Internships', 'Hackathons', 'Freshers', 'Remote'];

export default function JobsPage() {
  const { user } = useAuth();
  const isDiscussTeam = user?.id === 'ZUPjqx5LCwPqe2THOcIkrU7KaEj2';
  const location = useLocation();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState(() => {
    try {
      const cached = localStorage.getItem('discuss_fast_jobs');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [isSyncing, setIsSyncing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [shareItem, setShareItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const [pendingApplyJob, setPendingApplyJob] = useState(null);

  // First-load skeleton: only show skeletons if cache was empty
  const isFirstLoad = isSyncing && jobs.length === 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (id) navigate(`/jobs/${id}`, { replace: true });
  }, [location, navigate]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsSyncing(true);
    const unsubscribe = subscribeToJobs((data) => {
      setJobs(data);
      try { localStorage.setItem('discuss_fast_jobs', JSON.stringify(data)); } catch {}
      setIsSyncing(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEdit = useCallback((item) => { setEditData(item); setShowAdminModal(true); }, []);
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try { await deleteJob(id); toast.success('Job deleted'); }
    catch { toast.error('Failed to delete job'); }
  }, []);
  const handleShare = useCallback((item) => { setShareItem(item); setShowShareModal(true); }, []);
  const handleApply = useCallback((job) => {
    if (!user) { setPendingApplyJob(job); setShowGuestPopup(true); }
    else window.open(job.applyLink, '_blank', 'noopener,noreferrer');
  }, [user]);

  const isJobActive = useCallback((job) => {
    const now = Date.now();
    if (job.startDate && new Date(job.startDate).getTime() > now) return false;
    if (job.endDate && new Date(job.endDate).getTime() < now) return false;
    return true;
  }, []);

  const filteredJobs = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return jobs.filter(item => {
      const matchesSearch = !q ||
        item.title?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Jobs') return item.jobType === 'Job' || !item.jobType;
      if (activeFilter === 'Internships') return item.jobType === 'Internship';
      if (activeFilter === 'Hackathons') return item.jobType === 'Hackathon';
      if (activeFilter === 'Freshers') {
        const exp = (item.experienceType || '').toLowerCase();
        return exp.includes('fresher') || exp.includes('0') || exp.includes('1 year');
      }
      if (activeFilter === 'Remote') return (item.location || '').toLowerCase().includes('remote');
      return true;
    });
  }, [jobs, debouncedSearch, activeFilter]);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-28 text-neutral-950 dark:text-white">
      <Header />

      {/* Syncing bar — only after first load (cache present) */}
      {isSyncing && !isFirstLoad && (
        <div className="w-full bg-[#0095F6]/5 dark:bg-blue-500/10 discuss:bg-red-500/5 border-b border-neutral-200 dark:border-neutral-800 discuss:border-[#222] py-1.5 flex items-center justify-center gap-2 select-none z-10">
          <div className="w-3 h-3 border-2 border-[#0095F6] discuss:border-[#EF4444] border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0095F6] text-[#0095F6] dark:text-[#94A3B8]">
            Syncing latest jobs &amp; events...
          </span>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-32 lg:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          <Sidebar />
          <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 py-6 dark:border-neutral-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Tech Jobs <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">Beta</span>
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 mt-1">Find your next career move curated by Discuss.</p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs..."
                className="h-10 rounded-xl border-neutral-200 bg-neutral-50 pl-9 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
              />
            </div>
            {isDiscussTeam && (
              <Button onClick={() => { setEditData(null); setShowAdminModal(true); }} className="bg-[#0095F6] bg-[#0095F6] text-white hover:bg-[#1877F2] hover:bg-[#1877F2] shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add Job
              </Button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none select-none">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 border shrink-0 font-sans ${
                activeFilter === filter
                  ? 'bg-[#0095F6] bg-[#0095F6] text-white border-transparent shadow-[0_2px_10px_rgba(37,99,235,0.25)]'
                  : 'bg-white dark:bg-neutral-800 dark:bg-black text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 dark:border-[#262626] hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* ── Skeleton first load ── */}
          {isFirstLoad ? (
            Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-800 dark:bg-black rounded-[12px] border border-neutral-200 dark:border-neutral-700 dark:border-[#262626]">
              <Briefcase className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400 dark:text-neutral-400">No jobs found.</p>
            </div>
          ) : (
            <>
              {filteredJobs.map(item => {
                const active = isJobActive(item);
                return (
                  <div
                    id={`job-${item.id}`}
                    key={item.id}
                    className={`bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 transition-colors duration-200 overflow-hidden relative group ${!active ? 'opacity-75' : ''}`}
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {active ? (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> CLOSED
                              </span>
                            )}
                            {item.jobType === 'Hackathon' ? (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                {item.hackathonPlatform && item.hackathonPlatform !== 'Others' ? `HACKATHON BY ${item.hackathonPlatform}` : 'HACKATHON'}
                              </span>
                            ) : item.jobType === 'Internship' ? (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> INTERNSHIP
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> JOB
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600" /> {item.applyPlatform || 'Discuss'}
                            </span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-50 dark:text-white leading-tight">{item.title}</h2>
                          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 dark:text-neutral-400 mt-2 font-medium">
                            <Building className="w-4 h-4" /> {item.companyName}
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0 w-full md:w-auto">
                          <Button onClick={() => handleApply(item)} disabled={!active} className="flex-1 md:flex-none bg-[#0095F6] bg-[#0095F6] text-white hover:bg-[#1877F2] hover:bg-[#1877F2] font-semibold">
                            {active ? 'Apply Now' : 'Closed'}
                          </Button>
                          {isDiscussTeam && (
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(item)} className="p-2 bg-neutral-100 dark:bg-neutral-700 dark:bg-[#1A1A1A] text-neutral-600 dark:text-neutral-300 dark:text-white hover:bg-[#0095F6]/10 hover:text-[#0095F6] rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-2 bg-neutral-100 dark:bg-neutral-700 dark:bg-[#1A1A1A] text-neutral-600 dark:text-neutral-300 dark:text-white hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-700 dark:border-[#262626]">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]">
                          <Briefcase className="w-4 h-4 text-neutral-400" />
                          <span className="font-medium">Experience:</span> {item.experienceType || 'Not specified'}
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]">
                            <MapPin className="w-4 h-4 text-neutral-400" />
                            <span className="font-medium">Location:</span> {item.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4]">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <span className="font-medium">Posted:</span> {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md uppercase tracking-wider shadow-sm select-none">
                          <ShieldCheck className="w-3 h-3" /> Created by Discuss Team
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 dark:text-white mb-2">Job Description</h3>
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4] whitespace-pre-wrap leading-relaxed">
                          <ExpandableText text={item.description} maxLines={5}>
                            <LinkifiedText text={item.description} />
                          </ExpandableText>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700 dark:border-[#262626] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Button onClick={() => handleApply(item)} disabled={!active} className="bg-[#0095F6] bg-[#0095F6] text-white hover:bg-[#1877F2] hover:bg-[#1877F2] font-bold rounded-xl">
                            {active ? (item.jobType === 'Hackathon' ? 'Register Now' : 'Apply Now') : 'Application Closed'}
                          </Button>
                          <Button variant="ghost" onClick={() => navigate(`/jobs/${item.id}`)} className="text-[#0095F6] text-[#0095F6] hover:bg-[#0095F6]/10 discuss:hover:bg-[#EF4444]/10 rounded-xl font-bold text-sm">
                            Read Full Details
                          </Button>
                        </div>
                        <Button variant="ghost" onClick={() => handleShare(item)} className="text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#334155] rounded-xl font-semibold">
                          <Share2 className="w-4 h-4 mr-2" /> Share
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="text-center py-8 mt-6 select-none">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-2xl shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">You've reached the end! No more jobs or listings.</span>
                </div>
              </div>
            </>
          )}
        </div>
          </div>
        </div>
      </div>

      {showAdminModal && <JobAdminModal open={showAdminModal} onClose={() => setShowAdminModal(false)} editData={editData} />}
      {showShareModal && shareItem && <ItemShareModal open={showShareModal} onClose={() => { setShowShareModal(false); setShareItem(null); }} item={shareItem} type="job" />}
      {showGuestPopup && pendingApplyJob && <GuestApplyPopup open={showGuestPopup} onClose={() => { setShowGuestPopup(false); setPendingApplyJob(null); }} onSkip={() => pendingApplyJob && window.open(pendingApplyJob.applyLink, '_blank', 'noopener,noreferrer')} jobTitle={pendingApplyJob.title} />}

      {showScrollTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-32 md:bottom-12 right-6 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:scale-110 transition-transform z-50 group flex items-center justify-center border border-white/20" title="Scroll to top">
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </div>
  );
}
