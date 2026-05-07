import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getRelationshipStatus, 
  sendFriendRequest, 
  cancelFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest,
  unfollowFriend,
  RELATIONSHIP_STATUS 
} from '@/lib/relationshipsDb';
import { getOrCreateChat, generateChatId, blockChatWithInfo, unblockChat, isUserReported } from '@/lib/chatsDb';
import { notifyTelegramFriendAccepted } from '@/lib/telegramService';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, UserMinus, Clock, Check, X, MessageCircle, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function FriendRequestButton({ 
  targetUserId, 
  targetUsername,
  size = 'default', // 'sm', 'default', 'lg'
  showChat = true,
  onStatusChange,
  className = ''
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(RELATIONSHIP_STATUS.NONE);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);

  useEffect(() => {
    if (user?.id && targetUserId && user.id !== targetUserId) {
      loadStatus();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, targetUserId]);

  const loadStatus = async () => {
    try {
      const [relationshipStatus, reported] = await Promise.all([
        getRelationshipStatus(user.id, targetUserId),
        isUserReported(user.id, targetUserId)
      ]);
      setStatus(relationshipStatus);
      setIsReported(reported);
      
      // Check if request was already sent (for unfollowed users)
      if (relationshipStatus === RELATIONSHIP_STATUS.PENDING_SENT) {
        setHasSentRequest(true);
      }
    } catch (error) {
      console.error('Error loading relationship status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    setActionLoading(true);
    try {
      await sendFriendRequest(user.id, targetUserId);
      setStatus(RELATIONSHIP_STATUS.PENDING_SENT);
      setHasSentRequest(true); // Mark that request was sent
      toast.success(`Friend request sent to ${targetUsername}`);
      onStatusChange?.(RELATIONSHIP_STATUS.PENDING_SENT);
    } catch (error) {
      toast.error('Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    try {
      await cancelFriendRequest(user.id, targetUserId);
      setStatus(RELATIONSHIP_STATUS.NONE);
      toast.success('Friend request cancelled');
      onStatusChange?.(RELATIONSHIP_STATUS.NONE);
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setActionLoading(true);
    try {
      await acceptFriendRequest(user.id, targetUserId);
      // Unblock chat if it was blocked (re-friending)
      const chatId = generateChatId(user.id, targetUserId);
      try {
        await unblockChat(chatId);
      } catch {
        // Chat might not exist or wasn't blocked
      }
      setStatus(RELATIONSHIP_STATUS.FRIENDS);
      toast.success(`You and ${targetUsername} are now friends!`);
      onStatusChange?.(RELATIONSHIP_STATUS.FRIENDS);
      // Notify the requester via Telegram
      notifyTelegramFriendAccepted(targetUserId, user?.username).catch(() => {});
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    setActionLoading(true);
    try {
      await declineFriendRequest(user.id, targetUserId);
      setStatus(RELATIONSHIP_STATUS.NONE);
      toast.success('Friend request declined');
      onStatusChange?.(RELATIONSHIP_STATUS.NONE);
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setActionLoading(true);
    try {
      await unfollowFriend(user.id, targetUserId);
      // Block the chat with info about who blocked
      const chatId = generateChatId(user.id, targetUserId);
      try {
        await blockChatWithInfo(chatId, user.id);
      } catch {
        // Chat might not exist
      }
      setStatus(RELATIONSHIP_STATUS.UNFOLLOWED);
      setShowUnfollowConfirm(false);
      toast.success(`Unfollowed ${targetUsername}`);
      onStatusChange?.(RELATIONSHIP_STATUS.UNFOLLOWED);
    } catch (error) {
      toast.error('Failed to unfollow');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartChat = async () => {
    setActionLoading(true);
    try {
      await getOrCreateChat(user.id, targetUserId);
      navigate(`/chat/${targetUserId}`);
    } catch (error) {
      toast.error('Failed to start chat');
    } finally {
      setActionLoading(false);
    }
  };

  // Don't show if viewing own profile
  if (!user || user.id === targetUserId) {
    return null;
  }

  if (loading) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  const buttonSizeClass = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-5' : 'h-9 px-4';

  // If reported, show restricted state
  if (isReported) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 cursor-not-allowed ${buttonSizeClass} ${className}`}
      >
        <Ban className="w-4 h-4 mr-1.5" />
        Restricted
      </Button>
    );
  }

  // Render based on status
  switch (status) {
    case RELATIONSHIP_STATUS.NONE:
    case RELATIONSHIP_STATUS.UNFOLLOWED:
      // If user already sent a request (re-follow scenario), show "Requested" state
      if (hasSentRequest || status === RELATIONSHIP_STATUS.PENDING_SENT) {
        return (
          <Button
            variant="outline"
            size={size}
            disabled
            className={`border-[#F59E0B] text-[#F59E0B] ${buttonSizeClass} ${className}`}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Requested
          </Button>
        );
      }
      
      return (
        <Button
          onClick={handleSendRequest}
          disabled={actionLoading}
          size={size}
          className={`bg-[#2563EB] hover:bg-[#1D4ED8] text-white discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] rounded-[6px] shadow-button ${buttonSizeClass} ${className}`}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-1.5" />
              {status === RELATIONSHIP_STATUS.UNFOLLOWED ? 'Re-add Friend' : 'Add Friend'}
            </>
          )}
        </Button>
      );

    case RELATIONSHIP_STATUS.PENDING_SENT:
      return (
        <Button
          onClick={handleCancelRequest}
          disabled={actionLoading}
          variant="outline"
          size={size}
          className={`border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 ${buttonSizeClass} ${className}`}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Clock className="w-4 h-4 mr-1.5" />
              Requested
            </>
          )}
        </Button>
      );

    case RELATIONSHIP_STATUS.PENDING_RECEIVED:
      return (
        <div className={`flex gap-2 ${className}`}>
          <Button
            onClick={handleAcceptRequest}
            disabled={actionLoading}
            size={size}
            className={`bg-[#10B981] hover:bg-[#059669] text-white ${buttonSizeClass}`}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button
            onClick={handleDeclineRequest}
            disabled={actionLoading}
            variant="outline"
            size={size}
            className={`border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 ${buttonSizeClass}`}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      );

    case RELATIONSHIP_STATUS.FRIENDS:
      return (
        <div className={`flex gap-2 ${className}`}>
          {showChat && (
            <Button
              onClick={handleStartChat}
              disabled={actionLoading}
              size={size}
              className={`bg-[#2563EB] hover:bg-[#1D4ED8] text-white discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] ${buttonSizeClass}`}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Chat
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => setShowUnfollowConfirm(true)}
            disabled={actionLoading}
            variant="outline"
            size={size}
            className={`border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 ${buttonSizeClass}`}
          >
            <UserMinus className="w-4 h-4" />
          </Button>

          {/* Unfollow Confirmation Dialog */}
          <AlertDialog open={showUnfollowConfirm} onOpenChange={setShowUnfollowConfirm}>
            <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
              <AlertDialogHeader>
                <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">
                  Unfollow {targetUsername}?
                </AlertDialogTitle>
                <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
                  This will remove {targetUsername} from your friends list. You won't be able to chat with them anymore, but your chat history will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUnfollow}
                  disabled={actionLoading}
                  className="bg-[#EF4444] text-white hover:bg-[#DC2626]"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unfollow'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );

    default:
      return null;
  }
}
