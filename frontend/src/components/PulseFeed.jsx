import React, { useState, useEffect, useRef } from 'react';
import { IoHeart, IoHeartOutline, IoChatbubbleOutline, IoShareSocialOutline, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import { MoreVertical, X, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOptimizedVideoUrl } from '@/lib/imagekit';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { getRelationshipStatus, sendFriendRequest, unfollowFriend, RELATIONSHIP_STATUS } from '@/lib/relationshipsDb';
import { deletePulse, editPulseCaption } from '@/lib/pulseDb';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from 'sonner';
import './PulseFeed.css';

const PulseItem = ({ pulse, userId, onLike, checkLiked, onPulseDeleted }) => {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(pulse.likesCount || 0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Follow State
  const [followStatus, setFollowStatus] = useState(RELATIONSHIP_STATUS.NONE);
  const [showFollowConfirm, setShowFollowConfirm] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Pure View State
  const [pureMode, setPureMode] = useState(false);

  // Edit / Delete State
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState(pulse.caption || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const videoRef = useRef(null);
  const navigate = useNavigate();

  const isOwner = userId === pulse.authorId;

  useEffect(() => {
    const fetchLikedStatus = async () => {
      if (userId) {
        const status = await checkLiked(pulse.id, userId);
        setLiked(status);
      }
    };
    fetchLikedStatus();

    if (userId && !isOwner) {
      const fetchFollow = async () => {
        const statusObj = await getRelationshipStatus(userId, pulse.authorId);
        setFollowStatus(statusObj.status);
      };
      fetchFollow();
    }
  }, [pulse.id, userId, checkLiked, isOwner]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.7
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setPlaying(true);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      });
    }, options);

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const handleTogglePlay = () => {
    if (playing) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    const newLikedStatus = await onLike(pulse.id, userId);
    setLiked(newLikedStatus);
    setLikesCount(prev => newLikedStatus ? prev + 1 : Math.max(0, prev - 1));
  };

  const handleFollow = async () => {
    if (isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      await sendFriendRequest(userId, pulse.authorId);
      setFollowStatus(RELATIONSHIP_STATUS.PENDING);
      toast.success(`Followed ${pulse.authorUsername}`);
    } catch (e) {
      toast.error('Failed to follow');
    } finally {
      setIsFollowLoading(false);
      setShowFollowConfirm(false);
    }
  };

  const handleUnfollow = async () => {
    if (isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      await unfollowFriend(userId, pulse.authorId);
      setFollowStatus(RELATIONSHIP_STATUS.UNFOLLOWED);
      toast.success(`Unfollowed ${pulse.authorUsername}`);
    } catch (e) {
      toast.error('Failed to unfollow');
    } finally {
      setIsFollowLoading(false);
      setShowUnfollowConfirm(false);
    }
  };

  const handleEditSubmit = async () => {
    if (editCaptionText.length > 150) {
      toast.error('Caption must be 150 characters or less');
      return;
    }
    try {
      await editPulseCaption(pulse.id, editCaptionText);
      pulse.caption = editCaptionText;
      toast.success('Caption updated');
      setShowEditDialog(false);
    } catch (e) {
      toast.error('Failed to update caption');
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await deletePulse(pulse.id);
      toast.success('Pulse deleted');
      setShowDeleteConfirm(false);
      if (onPulseDeleted) onPulseDeleted(pulse.id);
    } catch (e) {
      toast.error('Failed to delete pulse');
    }
  };

  const truncateCaption = (text) => {
    if (!text) return '';
    if (text.length > 50 || text.includes('\n')) {
      const truncated = text.slice(0, 50).split('\n')[0];
      return (
        <span>
          {truncated}... <button onClick={(e) => { e.stopPropagation(); setShowFullCaption(true); }} className="text-white/70 font-bold ml-1">more</button>
        </span>
      );
    }
    return text;
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (isOwner) {
      navigate('/profile');
    } else {
      navigate(`/user/${pulse.authorId}`);
    }
  };


  return (
    <div className="pulse-item" onClick={handleTogglePlay}>
      <video
        ref={videoRef}
        className="pulse-video"
        src={getOptimizedVideoUrl(pulse.videoUrl)}
        loop
        muted={muted}
        playsInline
        onWaiting={() => setIsVideoLoading(true)}
        onPlaying={() => setIsVideoLoading(false)}
        onCanPlay={() => setIsVideoLoading(false)}
        onLoadStart={() => setIsVideoLoading(true)}
        onLoadedData={() => setIsVideoLoading(false)}
      />
      
      {isVideoLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none bg-black/10">
          <Loader2 className="w-8 h-8 animate-spin text-white drop-shadow-md opacity-80" />
        </div>
      )}
      
      {!playing && !pureMode && (
        <div className="play-overlay">
          <div className="play-icon" />
        </div>
      )}

      {!pureMode && (
        <>
          <div className="pulse-actions">
            <div className="action-item" onClick={handleLike}>
              {liked ? <IoHeart className="liked" size={28} /> : <IoHeartOutline size={28} />}
              <span>{likesCount}</span>
            </div>
            <div className="action-item">
              <IoChatbubbleOutline size={28} />
              <span>Soon</span>
            </div>
            <div className="action-item">
              <IoShareSocialOutline size={28} />
              <span>Soon</span>
            </div>
            {isOwner && (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="action-item" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical size={24} />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1 bg-[#0F172A] border-neutral-800" sideOffset={8} align="end">
                  <button onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-sm">Edit Caption</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-white/10 rounded-sm">Delete</button>
                </PopoverContent>
              </Popover>
            )}
            <div className="action-item" onClick={(e) => { e.stopPropagation(); setPureMode(true); }}>
              <Maximize2 size={24} />
            </div>
          </div>

          <div className="pulse-info">
            <div className="author-info flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2 cursor-pointer z-10" onClick={handleProfileClick}>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/20">
                  <UserAvatar user={{ photoURL: pulse.authorPhotoUrl, displayName: pulse.authorUsername }} className="w-full h-full" />
                </div>
                <span className="author-username font-semibold text-white drop-shadow-md">@{pulse.authorUsername}</span>
                
                {!isOwner && (
                  followStatus === RELATIONSHIP_STATUS.FRIENDS || followStatus === RELATIONSHIP_STATUS.PENDING ? (
                    <button onClick={(e) => { e.stopPropagation(); setShowUnfollowConfirm(true); }} className="follow-btn-pulse ml-2 !bg-transparent border border-white text-white">Followed</button>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setShowFollowConfirm(true); }} className="follow-btn-pulse ml-2">Follow</button>
                  )
                )}
              </div>
            </div>
            
            <div className="pulse-caption mt-2 mb-1 drop-shadow-md z-10 text-white" onClick={(e) => e.stopPropagation()}>
              {truncateCaption(pulse.caption)}
            </div>
            <div className="pulse-hashtags flex flex-wrap gap-1 z-10" onClick={(e) => e.stopPropagation()}>
              {pulse.hashtags?.map(tag => (
                <span key={tag} className="hashtag">#{tag}</span>
              ))}
            </div>
            <div className="public-badge mt-2 z-10">This Pulse video is public</div>
          </div>

          <div className="mute-control z-10" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}>
            {muted ? <IoVolumeMute size={24} /> : <IoVolumeHigh size={24} />}
          </div>
        </>
      )}

      {pureMode && (
        <div className="absolute bottom-6 right-4 z-50 p-2.5 bg-black/40 rounded-full cursor-pointer text-white hover:bg-black/60 transition-colors shadow-lg" onClick={(e) => { e.stopPropagation(); setPureMode(false); }}>
          <Minimize2 size={24} />
        </div>
      )}

      {/* Modals */}
      <Dialog open={showFollowConfirm} onOpenChange={setShowFollowConfirm}>
        <DialogContent className="bg-white dark:bg-[#0F172A] text-neutral-900 dark:text-neutral-50 sm:max-w-md" aria-describedby="follow-dialog">
          <DialogHeader>
            <DialogTitle>Follow {pulse.authorUsername}?</DialogTitle>
            <DialogDescription>They will be added to your connections.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFollowConfirm(false)}>Cancel</Button>
            <Button className="bg-[#2563EB] text-white hover:bg-[#1D4ED8]" onClick={handleFollow} disabled={isFollowLoading}>Follow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnfollowConfirm} onOpenChange={setShowUnfollowConfirm}>
        <DialogContent className="bg-white dark:bg-[#0F172A] text-neutral-900 dark:text-neutral-50 sm:max-w-md" aria-describedby="unfollow-dialog">
          <DialogHeader>
            <DialogTitle>Unfollow {pulse.authorUsername}?</DialogTitle>
            <DialogDescription>You will no longer be connected to this user.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnfollowConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnfollow} disabled={isFollowLoading}>Unfollow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-white dark:bg-[#0F172A] text-neutral-900 dark:text-neutral-50 sm:max-w-md" aria-describedby="delete-pulse-dialog">
          <DialogHeader>
            <DialogTitle>Delete Pulse</DialogTitle>
            <DialogDescription>Are you sure you want to delete this pulse? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSubmit}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white dark:bg-[#0F172A] text-neutral-900 dark:text-neutral-50 sm:max-w-md" aria-describedby="edit-pulse-dialog">
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              value={editCaptionText} 
              onChange={(e) => setEditCaptionText(e.target.value)} 
              className="bg-neutral-100 dark:bg-[#1E293B] border-transparent"
              rows={4}
            />
            <span className={`text-xs mt-1 block text-right ${editCaptionText.length > 150 ? 'text-red-500' : 'text-neutral-500'}`}>
              {editCaptionText.length}/150
            </span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-[#2563EB] text-white hover:bg-[#1D4ED8]" onClick={handleEditSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showFullCaption && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={(e) => { e.stopPropagation(); setShowFullCaption(false); }}>
          <div className="bg-[#1E293B] p-6 rounded-xl max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowFullCaption(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-white mb-4">Caption</h3>
            <p className="text-neutral-200 whitespace-pre-wrap">{pulse.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const PulseFeed = ({ pulses, userId, onLike, checkLiked, onRefresh }) => {
  const containerRef = useRef(null);

  if (!pulses || pulses.length === 0) {
    return (
      <div className="pulse-empty">
        <p>No pulse available yet. Be the first to share one!</p>
        <button className="refresh-btn" onClick={onRefresh}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="pulse-feed-container" ref={containerRef}>
      {pulses.map((pulse, index) => (
        <PulseItem 
          key={pulse.id} 
          pulse={pulse} 
          userId={userId} 
          onLike={onLike} 
          checkLiked={checkLiked}
        />
      ))}
      
      {pulses.length > 0 && (
        <div className="pulse-item end-message">
          <div className="end-content">
            <h3 className="text-xl font-bold mb-2">No more pulse available</h3>
            <p className="text-white/60 mb-6">You've reached the end of the feed.</p>
            <button className="refresh-btn bg-[#EF4444] text-white px-8 py-2.5 rounded-full font-bold hover:bg-[#DC2626] transition-all" onClick={onRefresh}>
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PulseFeed;
