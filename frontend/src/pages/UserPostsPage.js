import UserAvatar from '@/components/UserAvatar';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser, getPostsByUser } from '@/lib/db';
import { getUserPulses } from '@/lib/pulseDb';
import { getUserProfile } from '@/lib/userProfileDb';
import Header from '@/components/Header';
import PostCard from '@/components/PostCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import FriendRequestButton from '@/components/FriendRequestButton';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { ArrowLeft, User, FileText, Calendar, Loader2, ExternalLink, ChevronDown, ChevronUp, PlayCircle, Clock } from 'lucide-react';
import { database, ref, onValue } from '@/lib/firebase';
import useSecurityProtection from '@/hooks/useSecurityProtection';

export default function UserPostsPage() {
  useSecurityProtection();
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [userPulses, setUserPulses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [presenceData, setPresenceData] = useState({ isOnline: false, lastSeen: 0 });

  // Max characters before truncation
  const BIO_TRUNCATE_LENGTH = 150;

  useEffect(() => {
    if (!userId) return;
    const presenceRef = ref(database, `users/${userId}`);
    const unsubscribe = onValue(presenceRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setPresenceData({
          isOnline: val.isOnline || false,
          lastSeen: val.lastSeen || 0
        });
      } else {
        setPresenceData({ isOnline: false, lastSeen: 0 });
      }
    }, (err) => {
      console.error("Presence subscribe error:", err);
    });
    return () => unsubscribe();
  }, [userId]);

  const formatLastSeen = () => {
    const isActuallyOnline = presenceData.isOnline && (Date.now() - presenceData.lastSeen < 20000);
    if (isActuallyOnline) return 'Online';
    if (!presenceData.lastSeen) return 'Offline';
    
    const diffMs = Date.now() - presenceData.lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const date = new Date(presenceData.lastSeen);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };


  useEffect(() => {
    if (userId) {
      setLoading(true);
      setLoadingProfile(true);
      
      // Fetch from primary Firebase (user data + posts)
      Promise.all([getUser(userId), getPostsByUser(userId), getUserPulses(userId)])
        .then(([u, p, pulses]) => { 
          setUserData(u); 
          setPosts(p); 
          setUserPulses(pulses);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      
      // Fetch from secondary Firebase (profile data)
      getUserProfile(userId)
        .then(data => setProfileData(data))
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [userId]);

  const handlePostDeleted = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));
  const handlePostUpdated = (updatedPost) => setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
  const handleVoteChanged = (postId, voteData) => setPosts(prev =>
    prev.map(p => p.id === postId ? { ...p, upvote_count: voteData.upvote_count, downvote_count: voteData.downvote_count, votes: voteData.votes } : p)
  );

  const joinDate = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const initials = (userData?.username || 'U').slice(0, 2).toUpperCase();

  // Check if bio needs truncation
  const bioNeedsTruncation = profileData?.bio && profileData.bio.length > BIO_TRUNCATE_LENGTH;
  const displayBio = bioNeedsTruncation && !bioExpanded 
    ? profileData.bio.slice(0, BIO_TRUNCATE_LENGTH) + '...'
    : profileData?.bio;

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 pb-32">
        <button
          data-testid="user-posts-back"
          onClick={() => {
            if (location.state?.fromMap) {
              navigate('/devradar');
            } else {
              navigate(location.state?.from || '/feed');
            }
          }}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5] text-[13px] font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {location.state?.fromMap ? 'Back to Map' : 'Back'}
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-[#6275AF]" /></div>
        ) : !userData ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">User not found</h2>
          </div>
        ) : (
          <>
            {/* User header card */}
            <div className="bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-4">
                {/* Profile Picture - Clickable if exists */}
                {userData.photo_url && currentUser ? (
                  <button 
                    onClick={() => setShowImagePreview(true)}
                    className="relative group shrink-0"
                  >
                    <UserAvatar
                      userId={userId}
                      src={userData.photo_url}
                      username={userData.username}
                      className="w-14 h-14 shadow-md discuss:shadow-none discuss:border discuss:border-[#333333] group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <div className="bg-black/50 rounded-full p-1.5">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="shrink-0 flex flex-col items-center">
                    <UserAvatar userId={userId} src={null} username={userData?.username} className="w-14 h-14 opacity-70 grayscale" />
                    {!currentUser && (
                      <span className="text-[9px] text-[#EF4444] mt-2 font-medium bg-[#EF4444]/10 rounded px-1.5 py-0.5 border border-[#EF4444]/20 max-w-[80px] text-center leading-tight">
                        Secured
                      </span>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {/* Full Name (if available) */}
                  {profileData?.fullName && (
                    <h1 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[18px] flex items-center gap-1 no-copy">
                      {profileData.fullName}
                      {userData.verified && <VerifiedBadge size="sm" />}
                    </h1>
                  )}
                  
                  {/* Username */}
                  <div data-testid="user-posts-username" className={`flex items-center gap-1 no-copy ${profileData?.fullName ? 'text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[14px]' : 'font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[18px]'}`}>
                    @{userData.username}
                    {!profileData?.fullName && userData.verified && <VerifiedBadge size="sm" />}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="flex items-center gap-1 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[12px]">
                      <Calendar className="w-3.5 h-3.5" /> Joined {joinDate}
                    </span>
                    <span className="flex items-center gap-1 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[12px]">
                      <FileText className="w-3.5 h-3.5" /> {posts.length} posts
                    </span>
                    <span className="flex items-center gap-1.5 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[12px]">
                      <div className={`w-2 h-2 rounded-full ${formatLastSeen() === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-neutral-400 dark:bg-neutral-500'}`} />
                      <span className={formatLastSeen() === 'Online' ? 'text-emerald-500 font-semibold tracking-wide' : 'font-medium'}>
                        {formatLastSeen() === 'Online' ? 'Online' : formatLastSeen() === 'Offline' ? 'Offline' : `Last seen ${formatLastSeen()}`}
                      </span>
                    </span>
                  </div>

                  {/* Friend Request Button - Show if not viewing own profile */}
                  {currentUser && currentUser.id !== userId && (
                    <div className="mt-3">
                      <FriendRequestButton
                        targetUserId={userId}
                        targetUsername={userData.username}
                        size="sm"
                        showChat={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              {loadingProfile ? (
                <div className="mt-4 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6275AF]" />
                  <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs">Loading profile...</span>
                </div>
              ) : profileData?.bio && currentUser && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] no-copy">
                  <p className="text-[#0F172A] dark:text-[#E2E8F0] discuss:text-[#E5E7EB] text-[13px] leading-relaxed whitespace-pre-wrap">
                    {displayBio}
                  </p>
                  {bioNeedsTruncation && (
                    <button
                      onClick={() => setBioExpanded(!bioExpanded)}
                      className="text-[#2563EB] discuss:text-[#60A5FA] hover:underline text-[12px] mt-1 flex items-center gap-1"
                    >
                      {bioExpanded ? (
                        <>Show less <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Show more <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Social Links Section */}
              {!loadingProfile && currentUser && profileData?.socialLinks?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <div className="flex flex-wrap gap-2">
                    {profileData.socialLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] hover:bg-[#E8EBF0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#333333] text-[#2563EB] discuss:text-[#60A5FA] text-[12px] font-medium px-3 py-1.5 rounded-full border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] transition-colors"
                      >
                        {link.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {!currentUser && !loadingProfile && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                  <p className="text-[11px] text-[#EF4444] font-medium bg-[#EF4444]/10 rounded-md p-2 border border-[#EF4444]/20 inline-block">
                    For security reasons, we have blocked profile details and Pulse posts to non-logged-in users.
                  </p>
                </div>
              )}
            </div>

            {/* Pulse Videos */}
            {currentUser && (
              <div className="mb-6">
                <h3 className="font-bold text-[16px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-4 flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-[#EF4444]" /> Pulse Videos
                </h3>
                {userPulses.length === 0 ? (
                  <div className="text-center py-8 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                    <PlayCircle className="w-6 h-6 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mx-auto mb-2" />
                    <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px]">No Pulse videos yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {userPulses.map(pulse => (
                      <div key={pulse.id} className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all" onClick={() => navigate('/pulse')}>
                        <video src={pulse.videoUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-semibold truncate drop-shadow-md">
                          {pulse.caption || 'Pulse Video'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Posts */}
            <h3 className="font-bold text-[16px] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#2563EB]" /> Posts
            </h3>
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] rounded-2xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                <User className="w-8 h-8 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px]">This user hasn't posted anything yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onDeleted={handlePostDeleted}
                    onUpdated={handlePostUpdated}
                    onVoteChanged={handleVoteChanged}
                    onTagClick={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal 
        open={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={userData?.photo_url}
        altText={userData?.username}
      />
    </div>
  );
}
