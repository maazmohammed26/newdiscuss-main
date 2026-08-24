import { useState, useEffect, useCallback } from 'react';
import { 
  createCommentFirestore, 
  deleteCommentFirestore,
  subscribeToCommentsFirestore,
  createReply,
  subscribeToReplies,
  deleteReply,
  clearCommentBadge,
  clearReplyBadge,
  hasNewReplies
} from '@/lib/commentsDb';
import ExpandableText from '@/components/ExpandableText';
import VerifiedBadge from '@/components/VerifiedBadge';
import CommentUserInfoModal from '@/components/CommentUserInfoModal';
import LinkifiedText from '@/components/LinkifiedText';
import UserAvatar from '@/components/UserAvatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Send, Trash2, Loader2, MessageCircle, ChevronDown, ChevronUp, MoreHorizontal, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { notifyTelegramComment, notifyTelegramReply } from '@/lib/telegramService';
import { notifyDiscordComment, notifyDiscordReply } from '@/lib/discordService';

const COMMENT_CHAR_LIMIT = 500;

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Single Reply Item
function CommentReply({ reply, currentUser, postId, commentId, postAuthorId, onDelete }) {
  const isCurrentUser = reply.author_id === currentUser?.id;
  const isPostAuthor = reply.author_id === postAuthorId;
  
  return (
    <div className="flex items-start gap-2.5 ml-8 mt-2.5 text-xs">
      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5">
        <UserAvatar 
          src={reply.author_photo_url || null} 
          username={reply.author_username || 'User'} 
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="leading-snug">
          <span className="font-bold mr-1.5 text-neutral-900 dark:text-white">
            {reply.author_username}
          </span>
          {reply.author_verified && <VerifiedBadge size="xs" />}
          {isPostAuthor && (
            <span className="ml-1 text-[10px] font-bold text-[#0095F6] bg-blue-500/10 px-1 py-0.2 rounded">Author</span>
          )}
          <span className="text-neutral-900 dark:text-neutral-200 ml-1">
            <ExpandableText text={reply.text} maxLines={3}>
              <LinkifiedText text={reply.text} className="whitespace-pre-wrap" />
            </ExpandableText>
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400 font-medium">
          <span>{timeAgo(reply.timestamp)}</span>
          {isCurrentUser && (
            <button
              onClick={() => onDelete(reply.id)}
              className="text-[#ED4956] hover:underline cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Single Comment Item
function CommentItem({ comment, postAuthorId, currentUser, postId, onDelete, onUserClick, onAuthRequired }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [hasNewReply, setHasNewReply] = useState(false);
  
  const isPostAuthor = comment.author_id === postAuthorId;
  const isCurrentUser = comment.author_id === currentUser?.id;
  const replyCount = comment.replyCount || 0;

  useEffect(() => {
    if (isCurrentUser && currentUser?.id) {
      hasNewReplies(postId, comment.id, currentUser.id).then(setHasNewReply);
    }
  }, [postId, comment.id, currentUser?.id, isCurrentUser]);
  
  useEffect(() => {
    if (!showReplies) return;
    
    setLoadingReplies(true);
    const unsubscribe = subscribeToReplies(postId, comment.id, (newReplies) => {
      setReplies(newReplies);
      setLoadingReplies(false);
    });
    
    if (isCurrentUser && currentUser?.id) {
      clearReplyBadge(postId, comment.id, currentUser.id);
      setHasNewReply(false);
    }
    
    return () => unsubscribe();
  }, [showReplies, postId, comment.id, currentUser?.id, isCurrentUser]);
  
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!currentUser) {
      onAuthRequired();
      return;
    }
    setSubmittingReply(true);
    try {
      await createReply(postId, comment.id, replyText.trim(), currentUser, comment.author_id);
      setReplyText('');
      setShowReplyInput(false);
      if (!showReplies) setShowReplies(true);
      
      if (comment.author_id && currentUser?.id !== comment.author_id) {
        notifyTelegramReply(comment.author_id, currentUser?.username, replyText.trim()).catch(() => {});
        notifyDiscordReply(comment.author_id, currentUser?.username, replyText.trim()).catch(() => {});
      }
      toast.success('Reply posted');
    } catch (err) {
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await deleteReply(postId, comment.id, replyId);
      toast.success('Reply deleted');
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };

  return (
    <div className="py-2.5">
      <div className="flex items-start gap-2.5">
        <div 
          onClick={() => onUserClick(comment)}
          className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <UserAvatar 
            src={comment.author_photo_url || null} 
            username={comment.author_username || 'User'} 
            className="w-full h-full object-cover" 
          />
        </div>

        <div className="flex-1 min-w-0 text-xs">
          <div className="leading-snug">
            <span 
              onClick={() => onUserClick(comment)}
              className="font-bold mr-1.5 text-neutral-900 dark:text-white hover:underline cursor-pointer"
            >
              {comment.author_username}
            </span>
            {comment.author_verified && <VerifiedBadge size="xs" />}
            {isPostAuthor && (
              <span className="ml-1 text-[10px] font-bold text-[#0095F6] bg-blue-500/10 px-1 py-0.2 rounded">Author</span>
            )}
            <span className="text-neutral-900 dark:text-neutral-200 ml-1">
              <ExpandableText text={comment.content} maxLines={4}>
                <LinkifiedText text={comment.content} className="whitespace-pre-wrap" />
              </ExpandableText>
            </span>
          </div>

          <div className="flex items-center gap-3.5 mt-1.5 text-[11px] text-neutral-400 font-medium">
            <span>{timeAgo(comment.timestamp)}</span>
            <button
              onClick={() => {
                if (!currentUser) onAuthRequired();
                else setShowReplyInput(!showReplyInput);
              }}
              className="font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              Reply
            </button>
            {isCurrentUser && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[#ED4956] hover:underline cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <form onSubmit={handleSubmitReply} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${comment.author_username}...`}
                className="flex-1 px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-[#0095F6]"
                autoFocus
              />
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="text-xs font-bold text-[#0095F6] disabled:opacity-40 cursor-pointer"
              >
                {submittingReply ? '...' : 'Post'}
              </button>
            </form>
          )}

          {/* Show / Hide Replies */}
          {replyCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-2 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 cursor-pointer"
              >
                <span className="w-6 h-px bg-neutral-300 dark:bg-neutral-700" />
                <span>{showReplies ? 'Hide replies' : `View replies (${replyCount})`}</span>
              </button>

              {showReplies && (
                <div className="space-y-1 mt-1">
                  {loadingReplies ? (
                    <div className="py-2 text-[11px] text-neutral-400">Loading replies...</div>
                  ) : (
                    replies.map((reply) => (
                      <CommentReply
                        key={reply.id}
                        reply={reply}
                        currentUser={currentUser}
                        postId={postId}
                        commentId={comment.id}
                        postAuthorId={postAuthorId}
                        onDelete={handleDeleteReply}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main CommentsSection Component
export default function CommentsSection({ postId, postAuthorId, currentUser, onBadgeClear, onAuthRequired }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (!postId) return;
    const unsub = subscribeToCommentsFirestore(postId, (items) => {
      setComments(items);
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    if (onBadgeClear) onBadgeClear();
  }, [onBadgeClear]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUser) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    setSubmitting(true);
    try {
      await createCommentFirestore(postId, {
        author_id: currentUser.id,
        author_username: currentUser.username,
        author_photo_url: currentUser.photo_url || null,
        author_verified: !!currentUser.verified,
        content: commentText.trim(),
      });
      setCommentText('');
      toast.success('Comment posted');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteCommentFirestore(postId, deleteTargetId);
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="p-3.5 space-y-3">
      {/* Comments List */}
      <div className="divide-y divide-[#EFEFEF] dark:divide-[#262626] max-h-[360px] overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="py-6 text-center text-xs text-neutral-400">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">No comments yet. Start the conversation!</div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postAuthorId={postAuthorId}
              currentUser={currentUser}
              postId={postId}
              onDelete={(id) => setDeleteTargetId(id)}
              onUserClick={(user) => setSelectedUser(user)}
              onAuthRequired={onAuthRequired}
            />
          ))
        )}
      </div>

      {/* Main Comment Input */}
      <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-[#EFEFEF] dark:border-[#262626]">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={currentUser ? "Add a comment..." : "Sign in to join discussion"}
          disabled={!currentUser || submitting}
          maxLength={COMMENT_CHAR_LIMIT}
          className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#0095F6]"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || submitting || !currentUser}
          className="px-3.5 py-2 bg-[#0095F6] hover:bg-[#1877F2] text-white text-xs font-semibold rounded-xl disabled:opacity-40 cursor-pointer transition-colors"
        >
          {submitting ? '...' : 'Post'}
        </button>
      </form>

      {/* Delete Comment Confirm Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-900 dark:text-white text-base">Delete comment?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500 text-xs">
              Are you sure you want to delete this comment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteComment} 
              className="rounded-xl bg-[#ED4956] text-white text-xs font-semibold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedUser && (
        <CommentUserInfoModal
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          userId={selectedUser.author_id}
          username={selectedUser.author_username}
        />
      )}
    </div>
  );
}
