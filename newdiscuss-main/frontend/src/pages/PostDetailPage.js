import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPostById, toggleVote, updatePost, deletePost } from '@/lib/db';
import Header from '@/components/Header';
import CommentsSection from '@/components/CommentsSection';
import ShareModal from '@/components/ShareModal';
import LinkifiedText from '@/components/LinkifiedText';
import ExpandableText from '@/components/ExpandableText';
import UrlPreviewCard, { extractFirstUrl } from '@/components/UrlPreviewCard';
import ExternalLinkModal from '@/components/ExternalLinkModal';
import UserPreviewModal from '@/components/UserPreviewModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Share2, Pencil, Trash2, Github, ExternalLink, X, Check, Loader2, Hash } from 'lucide-react';
import { toast } from 'sonner';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PostDetailPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editPreview, setEditPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [voting, setVoting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [externalLink, setExternalLink] = useState(null);
  const [previewUser, setPreviewUser] = useState(null);

  useEffect(() => {
    if (postId) {
      setLoading(true);
      getPostById(postId)
        .then(p => {
          setPost(p);
          if (p) {
            setEditTitle(p.title || '');
            setEditContent(p.content || '');
            setEditGithub(p.github_link || '');
            setEditPreview(p.preview_link || '');
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [postId]);

  const handleUsernameClick = () => {
    if (!post) return;
    if (post.author_id === user?.id) {
      navigate('/profile');
    } else {
      setPreviewUser(post.author_id);
    }
  };

  const handleVote = async (voteType) => {
    if (voting || !post) return;
    setVoting(true);
    try {
      const data = await toggleVote(post.id, voteType, user.id);
      setPost(prev => ({ ...prev, upvote_count: data.upvote_count, downvote_count: data.downvote_count, votes: data.votes }));
    } catch (err) {
      if (err.message?.includes('below 0')) toast.error('Vote score cannot go below 0');
    } finally { setVoting(false); }
  };

  const handleSaveEdit = async () => {
    if (!post) return;
    setSaving(true);
    try {
      const payload = { content: editContent };
      if (post.type === 'project') { payload.title = editTitle; payload.github_link = editGithub; payload.preview_link = editPreview; }
      const data = await updatePost(post.id, payload, user.id);
      setPost(prev => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Post updated');
    } catch (err) { toast.error(err.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    try {
      await deletePost(post.id, user.id);
      toast.success('Post deleted');
      navigate('/feed', { replace: true });
    } catch (err) { toast.error(err.message || 'Failed to delete'); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const handleExternalLink = (url, e) => {
    if (e) e.preventDefault();
    setExternalLink({ url, isHttp: url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://') });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A]">
        <Header />
        <div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-[#6275AF]" /></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">Post not found</h2>
          <button onClick={() => navigate('/feed')} className="text-[#2563EB] hover:underline text-[13px] mt-2">Back to Feed</button>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === post.author_id;
  const isProject = post.type === 'project';
  const hashtags = post.hashtags || [];
  const userVote = (post.votes || {})[user?.id] || null;

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6">
        {/* Back button */}
        <button
          data-testid="post-detail-back"
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 text-[#6275AF] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white text-[13px] font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Feed
        </button>

        {/* Post Card */}
        <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-none overflow-hidden">
          <div className="p-5 md:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={isProject
                  ? 'bg-[#BC4800]/10 text-[#BC4800] border border-[#BC4800]/20 rounded-full px-2.5 py-0.5 text-xs font-semibold'
                  : 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 rounded-full px-2.5 py-0.5 text-xs font-semibold'
                }>
                  {isProject ? 'Project' : 'Discussion'}
                </span>
                <button
                  data-testid="post-detail-author"
                  onClick={handleUsernameClick}
                  className="font-semibold text-[#2563EB] hover:underline text-[14px] cursor-pointer"
                >
                  {post.author_username}
                </button>
                <span className="text-[#94A3B8] text-xs">{timeAgo(post.timestamp)}</span>
              </div>
              {isAuthor && !editing && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-[#F5F5F7] dark:hover:bg-[#334155] text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#94A3B8] hover:text-[#EF4444]"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            {/* Body */}
            {editing ? (
              <div className="space-y-3">
                {isProject && <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Project title" className="bg-[#F5F5F7] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] dark:text-[#F1F5F9] rounded-xl" />}
                <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={5} className="bg-[#F5F5F7] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] dark:text-[#F1F5F9] rounded-xl resize-none" />
                {isProject && (
                  <>
                    <Input value={editGithub} onChange={e => setEditGithub(e.target.value)} placeholder="GitHub link" className="bg-[#F5F5F7] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] dark:text-[#F1F5F9] rounded-xl" />
                    <Input value={editPreview} onChange={e => setEditPreview(e.target.value)} placeholder="Live preview link" className="bg-[#F5F5F7] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-[#334155] dark:text-[#F1F5F9] rounded-xl" />
                  </>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} disabled={saving} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-full px-4 text-[13px]">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Save</>}
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="ghost" className="text-[#6275AF] rounded-full px-4 text-[13px]"><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                {isProject && post.title && (
                  <h2 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] text-[18px] md:text-[20px] mb-2 leading-snug">{post.title}</h2>
                )}
                <div className="text-[#0F172A] dark:text-[#E2E8F0] text-[14px] md:text-[15px] leading-relaxed">
                  <ExpandableText text={post.content} maxLines={12}>
                    <span className="whitespace-pre-wrap"><LinkifiedText text={post.content} /></span>
                  </ExpandableText>
                </div>

                {/* URL Preview Card */}
                {extractFirstUrl(post.content) && (
                  <div className="mt-3">
                    <UrlPreviewCard url={extractFirstUrl(post.content)} />
                  </div>
                )}

                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {hashtags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 bg-[#F5F5F7] dark:bg-[#0F172A] rounded-full px-2.5 py-1 text-xs font-medium text-[#6275AF] dark:text-[#94A3B8]">
                        <Hash className="w-3 h-3" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {isProject && (post.github_link || post.preview_link) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.github_link && (
                      <button onClick={e => handleExternalLink(post.github_link, e)} className="inline-flex items-center gap-1.5 bg-[#0F172A] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A] rounded-lg px-3 py-1.5 text-xs font-medium hover:opacity-90">
                        <Github className="w-3.5 h-3.5" /> GitHub
                      </button>
                    )}
                    {post.preview_link && (
                      <button onClick={e => handleExternalLink(post.preview_link, e)} className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#1D4ED8]">
                        <ExternalLink className="w-3.5 h-3.5" /> Live Preview
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#E2E8F0] dark:border-[#334155]">
              <button onClick={() => handleVote('up')} disabled={voting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  userVote === 'up' ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30' : 'text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#10B981]/5 hover:text-[#10B981] border border-transparent'
                }`}>
                <ThumbsUp className="w-4 h-4" fill={userVote === 'up' ? 'currentColor' : 'none'} /> {post.upvote_count || 0}
              </button>
              <button onClick={() => handleVote('down')} disabled={voting}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  userVote === 'down' ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30' : 'text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#EF4444]/5 hover:text-[#EF4444] border border-transparent'
                }`}>
                <ThumbsDown className="w-4 h-4" fill={userVote === 'down' ? 'currentColor' : 'none'} /> {post.downvote_count || 0}
              </button>
              <div className="w-px h-4 bg-[#E2E8F0] dark:bg-[#334155] mx-1" />
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-[#6275AF] dark:text-[#94A3B8]">
                <MessageSquare className="w-4 h-4" /> {post.comment_count || 0}
              </span>
              <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#6275AF] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#334155]">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          )}

          {/* Comments always visible on detail page */}
          <CommentsSection postId={post.id} postAuthorId={post.author_id} currentUser={user} />
        </div>
      </div>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} post={post} />
      {externalLink && <ExternalLinkModal open={true} onClose={() => setExternalLink(null)} url={externalLink.url} isHttp={externalLink.isHttp} />}
      {previewUser && <UserPreviewModal open={true} onClose={() => setPreviewUser(null)} userId={previewUser} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155]">
          <AlertDialogHeader><AlertDialogTitle className="dark:text-[#F1F5F9]">Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8]">This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-[#EF4444] text-white hover:bg-[#DC2626]">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
