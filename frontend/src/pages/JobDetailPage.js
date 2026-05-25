import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJob } from '@/lib/firebaseSixth';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import LinkifiedText from '@/components/LinkifiedText';
import ItemShareModal from '@/components/ItemShareModal';
import GuestApplyPopup from '@/components/GuestApplyPopup';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Share2, ShieldCheck, ArrowUp, Calendar, Briefcase, Building, Star, MapPin } from 'lucide-react';

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Guest apply logic
  const [showGuestPopup, setShowGuestPopup] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
        const data = await getJob(jobId);
        setItem(data);
      } catch (err) {
        console.error('Error fetching job detail:', err);
      } finally {
        setLoading(false);
      }
    };
    if (jobId) {
      fetchItem();
    }
  }, [jobId]);

  const isJobActive = (job) => {
    if (!job) return false;
    const now = new Date().getTime();
    if (job.startDate && new Date(job.startDate).getTime() > now) return false;
    if (job.endDate && new Date(job.endDate).getTime() < now) return false;
    return true;
  };

  const handleApply = () => {
    if (!user) {
      setShowGuestPopup(true);
    } else {
      window.open(item.applyLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGuestSkip = () => {
    if (item) {
      window.open(item.applyLink, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB] discuss:text-[#EF4444]" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] flex flex-col">
        <Header />
        <div className="w-full max-w-3xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
          <div className="text-center py-16 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-2xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] mb-4">
              Posting Not Found
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mb-6">
              The job or hackathon listing you are looking for does not exist or has been removed.
            </p>
            <Button 
              onClick={() => navigate('/jobs')}
              className="bg-[#2563EB] discuss:bg-[#EF4444] text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const active = isJobActive(item);
  const isHackathon = item.jobType === 'Hackathon';
  const isInternship = item.jobType === 'Internship';

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6 pb-32">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] font-medium transition-colors mb-6 group text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Jobs List
        </button>

        {/* Dedicated Premium Job/Hackathon Card */}
        <article className={`bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] rounded-3xl border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] shadow-card overflow-hidden ${!active ? 'opacity-90' : ''}`}>
          
          {/* Header Banner - Colorful and elegant depending on type */}
          <div className={`h-4 md:h-6 ${
            isHackathon 
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500' 
              : isInternship 
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
                : 'bg-gradient-to-r from-blue-500 to-teal-500'
          }`} />

          <div className="p-6 md:p-10">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2.5 mb-6">
              {active ? (
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> CLOSED
                </span>
              )}

              {isHackathon && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> 
                  {item.hackathonPlatform && item.hackathonPlatform !== 'Others' 
                    ? `HACKATHON BY ${item.hackathonPlatform}` 
                    : 'HACKATHON'}
                </span>
              )}
              {isInternship && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> INTERNSHIP
                </span>
              )}
              {!isHackathon && !isInternship && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> JOB
                </span>
              )}

              <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md uppercase tracking-wider select-none flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600" /> {item.applyPlatform || 'Discuss'}
              </span>
            </div>

            {/* Title & Company Name */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-4xl font-extrabold text-neutral-900 dark:text-neutral-50 discuss:text-white tracking-tight leading-tight">
                  {item.title}
                </h1>
                
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 discuss:text-[#9CA3AF] mt-3 font-semibold text-lg">
                  <Building className="w-5 h-5 text-neutral-400" />
                  {item.companyName}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <Button 
                  onClick={handleApply}
                  disabled={!active}
                  className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white font-bold px-6 py-5 rounded-2xl text-base shadow-sm min-w-[140px]"
                >
                  {active ? (isHackathon ? 'Register Now' : 'Apply Now') : 'Closed'}
                </Button>
              </div>
            </div>

            {/* Quick specifications grid */}
            <div className={`grid grid-cols-1 ${item.location ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 p-5 bg-neutral-50 dark:bg-neutral-900/50 discuss:bg-[#1f1f1f] rounded-2xl border border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] mb-8`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-200/50 dark:bg-neutral-800 discuss:bg-[#2a2a2a] rounded-xl text-neutral-500 dark:text-neutral-400 shrink-0">
                  <Briefcase className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Experience</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] mt-0.5">{item.experienceType || 'Not specified'}</p>
                </div>
              </div>

              {item.location && (
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-200/50 dark:bg-neutral-800 discuss:bg-[#2a2a2a] rounded-xl text-neutral-500 dark:text-neutral-400 shrink-0">
                    <MapPin className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Location</p>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] mt-0.5">{item.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-200/50 dark:bg-neutral-800 discuss:bg-[#2a2a2a] rounded-xl text-neutral-500 dark:text-neutral-400 shrink-0">
                  <Calendar className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Posted Date</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-200/50 dark:bg-neutral-800 discuss:bg-[#2a2a2a] rounded-xl text-neutral-500 dark:text-neutral-400 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">Posted By</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5] mt-0.5">Discuss Team</p>
                </div>
              </div>
            </div>

            {/* Detailed sections */}
            <div className="space-y-8">
              {/* Job description */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 discuss:text-white border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] pb-2 mb-4">
                  {isHackathon ? 'Hackathon Information & JD' : 'Job Description & Requirements'}
                </h3>
                <div className="text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4] text-base leading-relaxed whitespace-pre-wrap font-normal">
                  <LinkifiedText text={item.description} />
                </div>
              </div>

              {/* About company (optional) */}
              {item.aboutCompany && (
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 discuss:text-white border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] pb-2 mb-4">
                    About {item.companyName}
                  </h3>
                  <div className="text-neutral-700 dark:text-neutral-300 discuss:text-[#D4D4D4] text-base leading-relaxed whitespace-pre-wrap font-normal">
                    <LinkifiedText text={item.aboutCompany} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer action buttons */}
            <div className="flex justify-between items-center mt-12 pt-6 border-t border-neutral-100 dark:border-neutral-700 discuss:border-[#262626]">
              <Button 
                onClick={handleApply}
                disabled={!active}
                className="bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white font-bold px-5 py-4 rounded-xl text-sm shadow-sm"
              >
                {active ? (isHackathon ? 'Register Now' : 'Apply Now') : 'Closed'}
              </Button>
              
              <Button 
                onClick={() => setShowShareModal(true)}
                className="bg-transparent text-[#6275AF] dark:text-[#94A3B8] hover:bg-neutral-100 dark:hover:bg-neutral-800 discuss:hover:bg-[#262626] rounded-xl px-4 py-2 text-sm font-semibold border border-neutral-200 dark:border-neutral-700 discuss:border-[#2a2a2a] transition-all"
              >
                <Share2 className="w-4 h-4 mr-2" /> Share {isHackathon ? 'Hackathon' : 'Job'}
              </Button>
            </div>
          </div>
        </article>
      </div>

      {showShareModal && (
        <ItemShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          item={item}
          type="job"
        />
      )}

      {showGuestPopup && (
        <GuestApplyPopup 
          open={showGuestPopup} 
          onClose={() => setShowGuestPopup(false)} 
          onSkip={handleGuestSkip}
          jobTitle={item.title}
        />
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-32 md:bottom-12 right-6 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:scale-110 transition-transform z-50 group flex items-center justify-center border border-white/20 animate-fade-in"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </div>
  );
}
