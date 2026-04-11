import { useState, useEffect, useCallback } from 'react';
import { getComments, subscribeToCommentsRealtime } from '@/lib/db';
import { 
  createCommentFirestore, 
  getCommentsFirestore, 
  deleteCommentFirestore,
  subscribeToCommentsFirestore,
  createReply,
  getReplies,
  subscribeToReplies,
  deleteReply,
  clearCommentBadge,
  clearReplyBadge,
  hasNewReplies
} from '@/lib/commentsDb';
import { 
  getCachedComments, 
  cacheComments
} from '@/lib/cacheManager';
import ExpandableText from '@/components/ExpandableText';
import VerifiedBadge from '@/components/VerifiedBadge';
import CommentUserInfoModal from '@/components/CommentUserInfoModal';
import LinkifiedText from '@/components/LinkifiedText';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Send, Trash2, Loader2, MessageSquare, ChevronDown, ChevronUp, Reply, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

const COMMENT_CHAR_LIMIT = 500;

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Reply Component
function CommentReply({ reply, currentUser, postId, commentId, postAuthorId, onDelete }) {
  const isCurrentUser = reply.author_id === currentUser?.id;
  const isPostAuthor = reply.author_id === postAuthorId;
  
  return (
    <div className={`ml-6 mt-2 pl-3 border-l-2 ${isPostAuthor ? 'border-[#BC4800] discuss:border-[#EF4444] bg-[#BC4800]/5 dark:bg-[#BC4800]/10 discuss:bg-[#EF4444]/5' : 'border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]'} rounded-r-md pr-2 py-1`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[#1D7AFF] discuss:text-[#60A5FA] text-[12px]">
            {reply.author_username}
          </span>
          {reply.author_verified && <VerifiedBadge size="xs" />}
          {isPostAuthor && (
            <span className="bg-[#BC4800]/15 discuss:bg-[#EF4444]/15 text-[#BC4800] discuss:text-[#EF4444] text-[9px] font-bold uppercase px-1 py-0.5 rounded">Author</span>
          )}
          <span className="text-[#6275AF] dark:text-[#94A3B8] text-[10px]">{timeAgo(reply.timestamp)}</span>
        </div>
        {isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5] transition-colors focus:outline-none">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(reply.id); }} className="cursor-pointer flex items-center gap-2 text-[#EF4444] focus:text-[#EF4444] hover:bg-[#EF4444]/10 text-[11px]">
                <Trash2 className="w-3 h-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="text-[#0F172A] dark:text-[#E2E8F0] discuss:text-[#E5E7EB] text-[12px] mt-0.5">
        <ExpandableText text={reply.text} maxLines={4}>
          <LinkifiedText text={reply.text} className="whitespace-pre-wrap" />
        </ExpandableText>
      </div>
    </div>
  );
}

// Comment with Replies Component
function CommentItem({ comment, postAuthorId, currentUser, postId, onDelete, onUserClick }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [hasNewReply, setHasNewReply] = useState(false);
  
  const isPostAuthor = comment.author_id === postAuthorId;
  const isCurrentUser = comment.author_id === currentUser?.id;
  const isClickable = !isCurrentUser;
  const replyCount = comment.replyCount || 0;
  
  // Check for new reply badge
  useEffect(() => {
    if (isCurrentUser && currentUser?.id) {
      hasNewReplies(postId, comment.id, currentUser.id).then(setHasNewReply);
    }
  }, [postId, comment.id, currentUser?.id, isCurrentUser]);
  
  // Load replies when opened
  useEffect(() => {
    if (!showReplies) return;
    
    setLoadingReplies(true);
    const unsubscribe = subscribeToReplies(postId, comment.id, (newReplies) => {
      setReplies(newReplies);
      setLoadingReplies(false);
    });
    
    // Clear badge when viewing replies
    if (isCurrentUser && currentUser?.id) {
      clearReplyBadge(postId, comment.id, currentUser.id);
      setHasNewReply(false);
    }
    
    return () => unsubscribe();
  }, [showReplies, postId, comment.id, currentUser?.id, isCurrentUser]);
  
  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    setSubmittingReply(true);
    try {
      await createReply(postId, comment.id, replyText, currentUser, comment.author_id);
      setReplyText('');
      setShowReplyInput(false);
      if (!showReplies) setShowReplies(true);
    } catch (err) {
      toast.error('Failed to add reply');
    } finally {
      setSubmittingReply(false);
    }
  };
  
  const handleDeleteReply = async (replyId) => {
    try {
      await deleteReply(postId, comment.id, replyId, currentUser.id);
      toast.success('Reply deleted');
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };
  
  return (
    <div 
      className={`border-l-4 rounded-r-md pl-4 py-3 pr-3 shadow-sm dark:shadow-none discuss:shadow-none ${
        isPostAuthor 
          ? 'border-[#BC4800] discuss:border-[#EF4444] bg-[#BC4800]/5 dark:bg-[#BC4800]/10 discuss:bg-[#EF4444]/10' 
          : 'border-[#2563EB] discuss:border-[#EF4444] bg-white dark:bg-[#1E293B] discuss:bg-[#262626]'
      }`}
    >
      {/* Comment Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="flex items-center gap-1">
            {isClickable ? (
              <button onClick={() => onUserClick(comment.author_id)} className="font-semibold text-[#1D7AFF] discuss:text-[#60A5FA] hover:underline text-[13px]">
                {comment.author_username}
              </button>
            ) : (
              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px]">
                {comment.author_username}
              </span>
            )}
            {comment.author_verified && <VerifiedBadge size="xs" />}
          </div>
          {isPostAuthor && (
            <span className="bg-[#BC4800]/15 discuss:bg-[#EF4444]/15 text-[#BC4800] discuss:text-[#EF4444] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">Author</span>
          )}
          <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs">{timeAgo(comment.timestamp)}</span>
        </div>
        {isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] hover:text-[#0F172A] dark:hover:text-white discuss:hover:text-[#F5F5F5] transition-colors focus:outline-none">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }} className="cursor-pointer flex items-center gap-2 text-[#EF4444] focus:text-[#EF4444] hover:bg-[#EF4444]/10 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Comment Text */}
      <div className="text-[#0F172A] dark:text-[#E2E8F0] discuss:text-[#E5E7EB] text-[13px] md:text-[15px] mt-1 leading-relaxed">
        <ExpandableText text={comment.text} maxLines={4}>
          <LinkifiedText text={comment.text} className="whitespace-pre-wrap" />
        </ExpandableText>
      </div>
      
      {/* Reply Actions */}
      <div className="flex items-center gap-3 mt-2">
        <button 
          onClick={() => setShowReplyInput(!showReplyInput)}
          className="flex items-center gap-1 text-[#6275AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] text-[11px] transition-colors"
        >
          <Reply className="w-3.5 h-3.5" />
          Reply
        </button>
        
        {replyCount > 0 && (
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-[#6275AF] hover:text-[#2563EB] discuss:hover:text-[#EF4444] text-[11px] transition-colors"
          >
            {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            {hasNewReply && !showReplies && (
              <span className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
            )}
          </button>
        )}
      </div>
      
      {/* Reply Input */}
      {showReplyInput && (
        <form onSubmit={handleSubmitReply} className="mt-2 ml-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 text-[12px] px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] dark:text-[#F1F5F9] focus:outline-none focus:border-[#2563EB] discuss:focus:border-[#EF4444]"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={submittingReply || !replyText.trim()}
              className="bg-[#2563EB] discuss:bg-[#EF4444] text-white px-3 py-1 h-auto text-[11px]"
            >
              {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </form>
      )}
      
      {/* Replies */}
      {showReplies && (
        <div className="mt-2">
          {loadingReplies ? (
            <div className="ml-6 flex items-center gap-2 text-[#6275AF] text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading replies...
            </div>
          ) : replies.length === 0 ? (
            <div className="ml-6 text-[#6275AF] text-[11px]">No replies yet</div>
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
  );
}

export default function CommentsSection({ postId, postAuthorId, currentUser, onBadgeClear }) {
  const [oldComments, setOldComments] = useState([]);
  const [newComments, setNewComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingOld, setLoadingOld] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [userInfoModal, setUserInfoModal] = useState(null);

  const allComments = [...oldComments, ...newComments].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const loading = loadingOld || loadingNew;
  const charCount = newComment.length;
  const isOverLimit = charCount > COMMENT_CHAR_LIMIT;

  // Clear comment badge when section is opened (for post owner)
  useEffect(() => {
    if (currentUser?.id === postAuthorId) {
      clearCommentBadge(postId, currentUser.id);
      onBadgeClear?.();
    }
  }, [postId, currentUser?.id, postAuthorId, onBadgeClear]);

  // Fetch old comments
  useEffect(() => {
    getComments(postId).then(data => {
      setOldComments(data.map(c => ({ ...c, source: 'realtime' })));
      setLoadingOld(false);
    }).catch(() => setLoadingOld(false));

    const unsubscribe = subscribeToCommentsRealtime(postId, (updatedComments) => {
      setOldComments(updatedComments.map(c => ({ ...c, source: 'realtime' })));
      setLoadingOld(false);
    });

    return () => unsubscribe();
  }, [postId]);

  // Fetch new comments with caching
  useEffect(() => {
    const loadComments = async () => {
      const cached = await getCachedComments(postId);
      if (cached?.length > 0) {
        setNewComments(cached.map(c => ({ ...c, source: 'firestore' })));
        setLoadingNew(false);
      }

      try {
        const data = await getCommentsFirestore(postId);
        const commentsWithSource = data.map(c => ({ ...c, source: 'firestore' }));
        setNewComments(commentsWithSource);
        await cacheComments(postId, commentsWithSource);
      } catch {}
      setLoadingNew(false);
    };

    loadComments();

    const unsubscribe = subscribeToCommentsFirestore(postId, async (updatedComments) => {
      const commentsWithSource = updatedComments.map(c => ({ ...c, source: 'firestore' }));
      setNewComments(commentsWithSource);
      await cacheComments(postId, commentsWithSource);
      setLoadingNew(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isOverLimit) return;
    setSubmitting(true);
    try {
      await createCommentFirestore(postId, newComment.trim(), currentUser, postAuthorId);
      setNewComment('');
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    
    const targetComment = allComments.find(c => c.id === deleteTarget);
    
    try {
      if (targetComment?.source === 'firestore') {
        await deleteCommentFirestore(deleteTarget, currentUser.id, postId);
        setNewComments(prev => prev.filter(c => c.id !== deleteTarget));
      } else {
        const { deleteComment } = await import('@/lib/db');
        await deleteComment(postId, deleteTarget, currentUser.id);
        setOldComments(prev => prev.filter(c => c.id !== deleteTarget));
      }
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete comment');
    } finally { 
      setDeleting(false); 
      setDeleteTarget(null); 
    }
  };

  return (
    <div className="border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] bg-[#F8FAFC]/30 dark:bg-[#0F172A]/30 discuss:bg-[#1a1a1a]/30">
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[#6275AF]" />
            <span className="text-[#6275AF] dark:text-[#94A3B8] text-xs">Loading comments...</span>
          </div>
        ) : allComments.length === 0 ? (
          <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-[13px] text-center py-3">No comments yet. Be the first!</p>
        ) : (
          allComments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postAuthorId={postAuthorId}
              currentUser={currentUser}
              postId={postId}
              onDelete={setDeleteTarget}
              onUserClick={setUserInfoModal}
            />
          ))
        )}
        
        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Textarea 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment... (URLs will be clickable)"
              rows={2}
              className="w-full bg-white dark:bg-[#0F172A] discuss:bg-[#262626] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] focus:border-[#2563EB] discuss:focus:border-[#EF4444] rounded-xl text-[13px] resize-none pr-12"
            />
            <Button 
              type="submit" 
              disabled={submitting || !newComment.trim() || isOverLimit}
              className="absolute right-2 bottom-2 bg-[#2563EB] discuss:bg-[#EF4444] text-white hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] rounded-lg px-3 py-1.5 h-auto shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[#6275AF] dark:text-[#94A3B8] text-[10px]">URLs will be clickable</span>
            <span className={`text-[10px] ${isOverLimit ? 'text-[#EF4444] font-medium' : 'text-[#6275AF]'}`}>
              {charCount}/{COMMENT_CHAR_LIMIT}
            </span>
          </div>
        </form>
      </div>
      
      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">Delete comment?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">This will permanently delete your comment and all its replies.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[#EF4444] text-white hover:bg-[#DC2626]">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Info Modal */}
      {userInfoModal && (
        <CommentUserInfoModal
          open={!!userInfoModal}
          onClose={() => setUserInfoModal(null)}
          userId={userInfoModal}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
}
