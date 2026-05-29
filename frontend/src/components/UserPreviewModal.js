import UserAvatar from '@/components/UserAvatar';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUser, getPostsByUser } from '@/lib/db';
import { getUserProfile } from '@/lib/userProfileDb';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/VerifiedBadge';
import FriendRequestButton from '@/components/FriendRequestButton';
import ReportModal from '@/components/ReportModal';
import { hasUserReportedTarget } from '@/lib/reportService';
import { User, FileText, Calendar, ArrowRight, Loader2, ExternalLink, ChevronDown, ChevronUp, Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import useSecurityProtection from '@/hooks/useSecurityProtection';
import { getEligibleDiscussionsCount, OFFICIAL_BADGES, BadgeIcon } from '@/components/Badges';

export default function UserPreviewModal({ open, onClose, userId, currentUserId, currentUser }) {
  useSecurityProtection();
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [postCount, setPostCount] = useState(0);
  const [eligiblePostCount, setEligiblePostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedLocally, setReportedLocally] = useState(false);

  const BIO_TRUNCATE_LENGTH = 80;

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      setLoadingProfile(true);
      setBioExpanded(false);
      setReportedLocally(hasUserReportedTarget(userId));
      
      // Fetch from primary Firebase
      Promise.all([getUser(userId), getPostsByUser(userId)])
        .then(([user, posts]) => {
          setUserData(user);
          setPostCount(posts.length);
          setEligiblePostCount(getEligibleDiscussionsCount(posts));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      
      // Fetch from secondary Firebase (profile data)
      getUserProfile(userId)
        .then((profile) => setProfileData(profile))
        .catch(() => setProfileData(null))
        .finally(() => setLoadingProfile(false));
    }
  }, [open, userId]);

  const handleReportClick = (e) => {
    e.stopPropagation();
    if (!currentUserId) {
      toast.error('You must be logged in to report.');
      return;
    }
    if (reportedLocally) {
      toast.warning('You have already submitted a report for this user.');
      return;
    }
    setShowReportModal(true);
  };

  const handleViewPosts = () => {
    onClose();
    navigate(`/user/${userId}`, { state: { from: location.pathname } });
  };

  const joinDate = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const initials = (userData?.username || 'U').slice(0, 2).toUpperCase();

  const bioNeedsTruncation = profileData?.bio && profileData.bio.length > BIO_TRUNCATE_LENGTH;
  const displayBio = bioNeedsTruncation && !bioExpanded 
    ? profileData.bio.slice(0, BIO_TRUNCATE_LENGTH) + '...'
    : profileData?.bio;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent aria-describedby={undefined} hideClose={true} className="sm:max-w-xs bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] dark:border-[#334155] discuss:border-[#333333] p-0 overflow-hidden">
          <DialogTitle className="sr-only">User Profile Preview</DialogTitle>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#6275AF]" />
            </div>
          ) : !userData ? (
            <div className="text-center py-12 px-6">
              <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px]">User not found</p>
            </div>
          ) : (
            <>
              {/* Header row: Close (left) + Flag (right) — never overlapping */}
              <div className="flex items-center justify-between px-3 pt-3">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#334155] discuss:hover:bg-[#262626] text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                {currentUserId && currentUserId !== userId ? (
                  <button
                    onClick={handleReportClick}
                    title={reportedLocally ? 'Already reported' : 'Report this user'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      reportedLocally
                        ? 'text-red-500 bg-red-500/10'
                        : 'text-neutral-400 hover:text-red-500 hover:bg-red-500/10'
                    }`}
                  >
                    <Flag className={`w-4 h-4 ${reportedLocally ? 'fill-current' : ''}`} />
                  </button>
                ) : (
                  <div className="w-8" />
                )}
              </div>

              <div className="bg-gradient-to-b from-[#2563EB]/10 to-transparent dark:from-[#2563EB]/20 discuss:from-[#EF4444]/10 pt-4 pb-4 px-6 text-center">
                {/* Profile Picture */}
                <div className="relative group mx-auto mb-3 inline-block">
                  <UserAvatar
                    userId={userId}
                    src={userData.photo_url || null}
                    username={userData.username}
                    className={`w-16 h-16 mx-auto shadow-lg discuss:shadow-none discuss:border discuss:border-[#333333] transition-opacity ${!currentUserId ? 'opacity-70 grayscale' : 'group-hover:opacity-90'}`}
                  />
                  {currentUserId && userData.photo_url && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none">
                      <div className="bg-black/50 rounded-full p-1.5">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                {/* Restricted message ONLY for non-logged-in users */}
                {!currentUserId && (
                  <p className="text-[10px] text-[#EF4444] mb-2 max-w-[200px] mx-auto leading-tight font-medium bg-[#EF4444]/10 rounded-md p-1.5 border border-[#EF4444]/20">
                    For security reasons, we have blocked the profile picture and social media links for non-logged-in users.
                  </p>
                )}
                
                {/* Full Name */}
                {profileData?.fullName && (
                  <h3 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[16px] flex items-center justify-center gap-1 no-copy">
                    {profileData.fullName}
                    {userData.verified && <VerifiedBadge size="xs" />}
                  </h3>
                )}
                
                {/* Username */}
                <p data-testid="user-preview-name" className={`flex items-center justify-center gap-1 no-copy ${profileData?.fullName ? 'text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px]' : 'font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[16px]'}`}>
                  @{userData.username}
                  {!profileData?.fullName && userData.verified && <VerifiedBadge size="xs" />}
                </p>

                {/* Achievements Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-2 border-t border-dashed border-[#E2E8F0] dark:border-[#334155]/60 discuss:border-[#333333]/50">
                  {OFFICIAL_BADGES.map((badge) => {
                    const isLocked = eligiblePostCount < badge.target;
                    return (
                      <button
                        key={badge.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(
                            `${badge.name} (${isLocked ? 'Locked 🔒' : 'Unlocked 🏆'})`,
                            {
                              description: `${badge.description} Progress: ${eligiblePostCount}/${badge.target} eligible posts.`,
                              duration: 4000
                            }
                          );
                        }}
                        className="transition-transform active:scale-90 hover:scale-105"
                        title={`${badge.name}: ${eligiblePostCount}/${badge.target}`}
                      >
                        <BadgeIcon badge={badge} isLocked={isLocked} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 pb-6 space-y-3">
                {/* Bio */}
                {loadingProfile ? (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#6275AF]" />
                    <span className="text-[#6275AF] text-xs">Loading...</span>
                  </div>
                ) : profileData?.bio && (
                  <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] discuss:border discuss:border-[#333333] rounded-xl p-3 no-copy">
                    <p className="text-[#0F172A] dark:text-[#E2E8F0] discuss:text-[#E5E7EB] text-[11px] leading-relaxed whitespace-pre-wrap">
                      {displayBio}
                    </p>
                    {bioNeedsTruncation && (
                      <button
                        onClick={() => setBioExpanded(!bioExpanded)}
                        className="text-[#2563EB] discuss:text-[#60A5FA] hover:underline text-[10px] mt-1 flex items-center gap-0.5"
                      >
                        {bioExpanded ? (
                          <>Less <ChevronUp className="w-2.5 h-2.5" /></>
                        ) : (
                          <>More <ChevronDown className="w-2.5 h-2.5" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Social Links */}
                {!loadingProfile && currentUserId && profileData?.socialLinks?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {profileData.socialLinks.slice(0, 4).map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] hover:bg-[#E8EBF0] dark:hover:bg-[#1E293B] discuss:hover:bg-[#333333] text-[#2563EB] discuss:text-[#60A5FA] text-[10px] font-medium px-2 py-1 rounded-full border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] transition-colors"
                      >
                        {link.name}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                    {profileData.socialLinks.length > 4 && (
                      <span className="text-[#6275AF] text-[10px]">+{profileData.socialLinks.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] discuss:border discuss:border-[#333333] rounded-xl p-3 text-center">
                    <Calendar className="w-4 h-4 text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] mx-auto mb-1" />
                    <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[12px] font-semibold">{joinDate}</p>
                    <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[10px]">Joined</p>
                  </div>
                  <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#262626] discuss:border discuss:border-[#333333] rounded-xl p-3 text-center">
                    <FileText className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444] mx-auto mb-1" />
                    <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[12px] font-semibold">{postCount}</p>
                    <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[10px]">Posts</p>
                  </div>
                </div>

                {/* Friend Actions - Only show for other users */}
                {currentUserId && currentUserId !== userId && (
                  <div className="flex justify-center">
                    <FriendRequestButton
                      targetUserId={userId}
                      targetUsername={userData?.username}
                      size="sm"
                      showChat={true}
                    />
                  </div>
                )}

                <Button
                  data-testid="user-preview-view-posts"
                  onClick={handleViewPosts}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white font-medium rounded-full py-2.5 text-[13px]"
                >
                  View All Posts <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      {showReportModal && userData && (
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="user"
          targetId={userId}
          targetTitleOrName={userData.username || 'Unknown User'}
          targetOwnerId={userId}
          currentUser={currentUser}
          onReportSuccess={() => setReportedLocally(true)}
        />
      )}
    </>
  );
}
