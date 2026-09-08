import UserAvatar from '@/components/UserAvatar';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getUser, getPostsByUser } from '@/lib/db';
import { getUserPulses } from '@/lib/pulseDb';
import { getUserProfile, getCachedUserProfile } from '@/lib/userProfileDb';
import { resolveBanner } from '@/lib/bannerPresets';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PostCard from '@/components/PostCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import { isUserVerified } from '@/lib/verification';
import FriendRequestButton from '@/components/FriendRequestButton';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import ProfileSocialLinks from '@/components/ProfileSocialLinks';
import ProfileShareModal from '@/components/ProfileShareModal';
import ProfileHeroSkeleton from '@/components/ProfileHeroSkeleton';
import LinkifiedText from '@/components/LinkifiedText';

import { ArrowLeft, User, FileText, Calendar, Loader2, PlayCircle, ShieldCheck, Flag, Share2 } from 'lucide-react';
import { database, ref, onValue } from '@/lib/firebase';
import useSecurityProtection from '@/hooks/useSecurityProtection';
import ReportModal from '@/components/ReportModal';
import { hasUserReportedTarget } from '@/lib/reportService';

export default function UserPostsPage() {
  useSecurityProtection();
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(() => getCachedUserProfile(userId) || null);
  const [posts, setPosts] = useState([]);
  const [userPulses, setUserPulses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(() => !getCachedUserProfile(userId));

  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [presenceData, setPresenceData] = useState({ isOnline: false, lastSeen: 0 });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedLocally, setReportedLocally] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'pulses'

  useEffect(() => {
    if (userId) {
      setReportedLocally(hasUserReportedTarget(userId));
    }
  }, [userId]);

  // Real presence subscription
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
      console.error('Presence subscribe error:', err);
    });
    return () => unsubscribe();
  }, [userId]);

  const formatLastSeen = () => {
    if (userData?.isOnlineVisible === false || profileData?.isOnlineVisible === false) {
      return 'Offline';
    }
    const isActuallyOnline = presenceData.isOnline && (Date.now() - (presenceData.lastSeen || 0) < 60000);
    if (isActuallyOnline) return 'Online';
    if (!presenceData.lastSeen || presenceData.lastSeen <= 0) return 'Offline';

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
      const cached = getCachedUserProfile(userId);
      if (cached) {
        setProfileData(cached);
        setLoadingProfile(false);
      } else {
        setLoadingProfile(true);
      }
      setLoading(true);

      // Fetch primary user data, posts, and pulses
      Promise.all([getUser(userId), getPostsByUser(userId), getUserPulses(userId)])
        .then(([u, p, pulses]) => {
          setUserData(u);
          setPosts(p || []);
          setUserPulses(pulses || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      // Fetch profile data from secondary Firebase (silent revalidation)
      getUserProfile(userId)
        .then(data => {
          if (data) setProfileData(data);
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [userId]);


  const handlePostDeleted = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));
  const handlePostUpdated = (updatedPost) => setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
  const handleVoteChanged = (postId, voteData) => setPosts(prev =>
    prev.map(p => p.id === postId ? { ...p, upvote_count: voteData.upvote_count, downvote_count: voteData.downvote_count, votes: voteData.votes } : p)
  );

  const handleReportClick = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (reportedLocally) {
      toast.warning('You have already submitted a report for this user.');
      return;
    }
    setShowReportModal(true);
  };

  // Safe joined date formatting (empty string if invalid or absent)
  const rawCreatedAt = userData?.created_at || userData?.createdAt || profileData?.createdAt;
  let joinDate = '';
  if (rawCreatedAt) {
    try {
      const parsed = new Date(rawCreatedAt);
      if (!isNaN(parsed.getTime())) {
        joinDate = parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    } catch {}
  }

  // Bio from multiple potential fields
  const userBio = profileData?.bio || userData?.bio || userData?.talentGraph?.bio || '';

  // Banner resolution with strict priority:
  // selected bannerThemeId -> existing legacy banner image -> default fallback
  const resolvedBanner = resolveBanner({
    bannerThemeId: profileData?.bannerThemeId,
    bannerUrl: profileData?.bannerUrl,
    banner_url: userData?.banner_url
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white pb-28 select-none">
      <Header />
      <div className="w-full max-w-5xl lg:max-w-[1240px] mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_600px_300px] justify-center gap-6">
          <Sidebar />
          <div className="w-full max-w-[600px] mx-auto min-w-0 flex-1">
            {/* Top Bar */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#EFEFEF] dark:border-[#262626]">
              <button
                onClick={() => {
                  if (location.state?.fromMap) {
                    navigate('/devradar');
                  } else {
                    navigate(location.state?.from || -1);
                  }
                }}
                className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2px]" />
                <span>{location.state?.fromMap ? 'Back to Map' : 'Back'}</span>
              </button>
              <span className="text-sm font-bold text-neutral-900 dark:text-white truncate max-w-[200px]">
                {profileData?.fullName || userData?.full_name || userData?.username || 'Profile'}
              </span>
              <div className="flex items-center gap-2">
                {currentUser && currentUser.id !== userId && (
                  <button
                    onClick={handleReportClick}
                    className="p-1.5 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title={reportedLocally ? 'Already Reported' : 'Report User'}
                    aria-label="Report User"
                  >
                    <Flag className={`w-4 h-4 ${reportedLocally ? 'text-red-500 fill-current' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {loading && !userData ? (
              <ProfileHeroSkeleton />
            ) : !userData ? (
              <div className="text-center py-20 px-4">
                <p className="text-sm font-medium text-neutral-500">This account has been deleted or does not exist.</p>
              </div>

            ) : (
              <>
                {/* Banner */}
                <div className={`relative w-full h-32 sm:h-36 md:h-44 overflow-hidden ${resolvedBanner.type === 'gradient' ? resolvedBanner.className : 'bg-neutral-100 dark:bg-neutral-900'}`}>
                  {resolvedBanner.type === 'image' && (
                    <img src={resolvedBanner.url} alt="Profile banner" className="w-full h-full object-cover" />
                  )}
                  {resolvedBanner.type === 'gradient' && (
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                  )}
                </div>

                {/* Profile Hero Body */}
                <div className="px-4 pb-4 border-b border-[#EFEFEF] dark:border-[#262626] bg-white dark:bg-black">
                  {/* Overlapping Avatar & Action Buttons */}
                  <div className="flex items-end justify-between -mt-11 sm:-mt-12 md:-mt-14 mb-3">
                    <div className="relative group">
                      <div
                        onClick={() => userData?.photo_url && currentUser ? setShowImagePreview(true) : null}
                        className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] md:w-[104px] md:h-[104px] rounded-full ring-4 ring-white dark:ring-black bg-white dark:bg-black overflow-hidden shadow-md cursor-pointer"
                      >
                        <UserAvatar
                          src={userData?.photo_url}
                          username={userData?.username}
                          userId={userId}
                          priority
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Relationship Actions */}
                    <div className="flex items-center gap-2">
                      {currentUser && currentUser.id !== userId && (
                        <FriendRequestButton
                          targetUserId={userId}
                          targetUsername={userData?.username}
                          size="sm"
                          showChat={true}
                        />
                      )}
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        aria-label="Share profile"
                        title="Share profile"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Names & Badges */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h1 className="font-heading text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
                        {profileData?.fullName || userData?.full_name || userData?.username}
                      </h1>
                      {(isUserVerified(userData) || isUserVerified(profileData)) && <VerifiedBadge size="md" />}
                    </div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm font-medium">
                      @{userData?.username}
                    </p>
                  </div>

                  {userId === 'ZUPjqx5LCwPqe2THOcIkrU7KaEj2' && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md uppercase tracking-wider shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Discuss Team
                      </span>
                    </div>
                  )}

                  {/* Bio */}
                  {userBio && (
                    <div className="mt-2 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed max-w-xl whitespace-pre-wrap">
                      <LinkifiedText text={userBio} />
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {joinDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Joined {joinDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${formatLastSeen() === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-400 dark:bg-neutral-500'}`} />
                      <span className={formatLastSeen() === 'Online' ? 'text-emerald-500 font-semibold' : 'font-medium'}>
                        {formatLastSeen() === 'Online' ? 'Online' : formatLastSeen() === 'Offline' ? 'Offline' : `Last seen ${formatLastSeen()}`}
                      </span>
                    </div>
                  </div>

                  {/* Social Links */}
                  {currentUser && profileData?.socialLinks?.length > 0 && (
                    <ProfileSocialLinks links={profileData.socialLinks} className="mt-3" />
                  )}

                  {!currentUser && (
                    <div className="mt-3 text-xs text-neutral-400">
                      Sign in to view full developer links, media, and direct messaging.
                    </div>
                  )}
                </div>

                {/* Tabs: Posts & Pulses ONLY (No Friends tab or count) */}
                <div className="border-b border-[#EFEFEF] dark:border-[#262626] bg-white dark:bg-black">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 ${
                        activeTab === 'posts'
                          ? 'border-[#0095F6] text-[#0095F6]'
                          : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Posts ({posts.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('pulses')}
                      className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 border-b-2 ${
                        activeTab === 'pulses'
                          ? 'border-[#0095F6] text-[#0095F6]'
                          : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Pulses ({userPulses.length})</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content: Posts */}
                {activeTab === 'posts' && (
                  <div className="divide-y divide-neutral-100 dark:divide-[#222222]">
                    {posts.length === 0 ? (
                      <div className="py-16 text-center text-xs text-neutral-400 dark:text-neutral-500">
                        This user hasn't posted any discussions yet.
                      </div>
                    ) : (
                      posts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          currentUser={currentUser}
                          onDeleted={handlePostDeleted}
                          onUpdated={handlePostUpdated}
                          onVoteChanged={handleVoteChanged}
                          onTagClick={() => {}}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Tab Content: Pulses */}
                {activeTab === 'pulses' && (
                  <div className="p-4">
                    {userPulses.length === 0 ? (
                      <div className="py-16 text-center text-xs text-neutral-400 dark:text-neutral-500">
                        No Pulse videos posted yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {userPulses.map(pulse => (
                          <div
                            key={pulse.id}
                            className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all bg-black"
                            onClick={() => navigate('/pulse')}
                          >
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={showImagePreview}
        onClose={() => setShowImagePreview(false)}
        imageUrl={userData?.photo_url}
        altText={userData?.username}
      />

      {/* Share Profile Modal */}
      <ProfileShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        user={{
          ...userData,
          id: userId,
          fullName: profileData?.fullName || userData?.full_name,
          username: userData?.username
        }}
        username={userData?.username}
        isOwnProfile={currentUser?.id === userId}
      />


      {/* Report Modal */}
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="user"
        targetId={userId}
        targetTitleOrName={userData?.username}
        targetOwnerId={userId}
        currentUser={currentUser}
        onReportSuccess={() => setReportedLocally(true)}
      />
    </div>
  );
}
