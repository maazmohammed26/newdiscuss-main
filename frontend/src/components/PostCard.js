import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleVote, deletePost } from '@/lib/db';
import { createCommentFirestore } from '@/lib/commentsDb';
import CommentsSection from '@/components/CommentsSection';
import ShareModal from '@/components/ShareModal';
import EditPostModal from '@/components/EditPostModal';
import LinkifiedText from '@/components/LinkifiedText';
import ExpandableText from '@/components/ExpandableText';
import UrlPreviewCard, { extractFirstUrl } from '@/components/UrlPreviewCard';
import ExternalLinkModal from '@/components/ExternalLinkModal';
import UserPreviewModal from '@/components/UserPreviewModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import GuestAuthModal from '@/components/GuestAuthModal';
import UserAvatar from '@/components/UserAvatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Github, 
  ExternalLink, 
  Globe, 
  RotateCcw, 
  Flag, 
  Check, 
  ShieldCheck, 
  ThumbsDown
} from 'lucide-react';
import { toast } from 'sonner';
import MediaCarousel from '@/components/MediaCarousel';
import FullscreenMedia from '@/components/FullscreenMedia';
import ReportModal from '@/components/ReportModal';
import { motion, AnimatePresence } from 'framer-motion';

const TRANSLATE_LANGUAGES = [
  { code: 'kn', label: 'Kannada' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'en', label: 'English' },
];

const LANG_LABELS = Object.fromEntries(TRANSLATE_LANGUAGES.map(l => [l.code, l.label]));
const POST_URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const TRANSLATE_API_BASE = 'https://translate.googleapis.com/translate_a/single';

async function translatePostContent(text, targetLang) {
  const urls = [];
  const textWithPlaceholders = text.replace(POST_URL_REGEX, (match) => {
    const idx = urls.length;
    urls.push(match);
    return `[LINK_${idx}]`;
  });
  POST_URL_REGEX.lastIndex = 0;

  const res = await fetch(
    `${TRANSLATE_API_BASE}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(textWithPlaceholders)}`
  );
  if (!res.ok) throw new Error(`Translation failed (HTTP ${res.status})`);

  const data = await res.json();
  let translated = data[0].map(s => s[0]).join('');

  urls.forEach((url, i) => {
    translated = translated.split(`[LINK_${i}]`).join(url);
  });

  return translated;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, currentUser, onDeleted, onUpdated, onVoteChanged, onTagClick }) {
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [externalLink, setExternalLink] = useState(null);
  const [previewUser, setPreviewUser] = useState(null);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSafetyExplanation, setShowSafetyExplanation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [quickComment, setQuickComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const getInitialUpvotes = (p) => {
    if (typeof p.upvote_count === 'number') return p.upvote_count;
    if (typeof p.upvotes === 'number') return p.upvotes;
    if (p.votes && typeof p.votes === 'object') {
      return Object.values(p.votes).filter(v => v === 'up').length;
    }
    return 0;
  };

  const getInitialDownvotes = (p) => {
    if (typeof p.downvote_count === 'number') return p.downvote_count;
    if (typeof p.downvotes === 'number') return p.downvotes;
    if (p.votes && typeof p.votes === 'object') {
      return Object.values(p.votes).filter(v => v === 'down').length;
    }
    return 0;
  };

  const getInitialUserVote = (p, uid) => {
    if (p.user_vote) return p.user_vote;
    if (uid && p.votes && typeof p.votes === 'object' && p.votes[uid]) {
      return p.votes[uid];
    }
    return null;
  };

  const [upvoteCount, setUpvoteCount] = useState(() => getInitialUpvotes(post));
  const [downvoteCount, setDownvoteCount] = useState(() => getInitialDownvotes(post));
  const [userVote, setUserVote] = useState(() => getInitialUserVote(post, currentUser?.id));

  useEffect(() => {
    setUpvoteCount(getInitialUpvotes(post));
    setDownvoteCount(getInitialDownvotes(post));
    setUserVote(getInitialUserVote(post, currentUser?.id));
  }, [post, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setIsBookmarked(false);
      return;
    }
    const checkBookmark = () => {
      try {
        const bookmarks = JSON.parse(localStorage.getItem(`discuss_bookmarks_${currentUser.id}`) || '[]');
        setIsBookmarked(bookmarks.includes(post.id));
      } catch (e) {
        setIsBookmarked(false);
      }
    };
    checkBookmark();
    window.addEventListener('discuss_bookmarks_updated', checkBookmark);
    return () => window.removeEventListener('discuss_bookmarks_updated', checkBookmark);
  }, [post.id, currentUser?.id]);

  const handleBookmarkClick = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const key = `discuss_bookmarks_${currentUser.id}`;
      let bookmarks = JSON.parse(localStorage.getItem(key) || '[]');
      if (bookmarks.includes(post.id)) {
        bookmarks = bookmarks.filter(id => id !== post.id);
        toast.success('Removed from bookmarks');
      } else {
        bookmarks.push(post.id);
        toast.success('Saved to bookmarks');
      }
      localStorage.setItem(key, JSON.stringify(bookmarks));
      setIsBookmarked(bookmarks.includes(post.id));
      window.dispatchEvent(new Event('discuss_bookmarks_updated'));
    } catch (err) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleVote = async (type) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (voting) return;
    setVoting(true);

    const prevUserVote = userVote;
    const prevUpvotes = upvoteCount;
    const prevDownvotes = downvoteCount;

    let newVote = null;
    let newUp = prevUpvotes;
    let newDown = prevDownvotes;

    if (prevUserVote === type) {
      newVote = null;
      if (type === 'up') newUp = Math.max(0, newUp - 1);
      else newDown = Math.max(0, newDown - 1);
    } else {
      newVote = type;
      if (type === 'up') {
        newUp += 1;
        if (prevUserVote === 'down') newDown = Math.max(0, newDown - 1);
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 800);
      } else {
        newDown += 1;
        if (prevUserVote === 'up') newUp = Math.max(0, newUp - 1);
      }
    }

    setUserVote(newVote);
    setUpvoteCount(newUp);
    setDownvoteCount(newDown);

    try {
      const res = await toggleVote(post.id, type, currentUser.id);
      if (res) {
        setUpvoteCount(res.upvote_count);
        setDownvoteCount(res.downvote_count);
        onVoteChanged?.(post.id, res);
      }
    } catch (err) {
      setUserVote(prevUserVote);
      setUpvoteCount(prevUpvotes);
      setDownvoteCount(prevDownvotes);
      toast.error('Failed to register reaction');
    } finally {
      setVoting(false);
    }
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (userVote !== 'up') {
      handleVote('up');
    } else {
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  };

  const handleQuickCommentSubmit = async (e) => {
    e.preventDefault();
    if (!quickComment.trim()) return;
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setSubmittingComment(true);
    try {
      await createCommentFirestore(post.id, quickComment.trim(), currentUser, post.author_id);
      setQuickComment('');
      toast.success('Comment posted');
      setShowComments(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTranslate = async (langCode) => {
    setTranslating(true);
    try {
      const translated = await translatePostContent(post.content, langCode);
      setTranslatedContent(translated);
      toast.success(`Translated to ${LANG_LABELS[langCode]}`);
    } catch (e) {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id, currentUser?.id);
      toast.success('Post deleted');
      onDeleted?.(post.id);
    } catch (err) {
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!post.code) return;
    navigator.clipboard.writeText(post.code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isAuthor = currentUser?.id === post.author_id;
  const isProject = post.type === 'project';
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];

  return (
    <>
      {/* Edge-to-Edge Instagram Post (No card borders/shadows/rounded boxes) */}
      <article
        data-testid={`post-card-${post.id}`}
        className="w-full bg-white dark:bg-black border-b border-[#EFEFEF] dark:border-[#262626] pb-4 mb-2 select-none"
      >
        {/* Post Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              onClick={(e) => { e.stopPropagation(); setPreviewUser(post.author_id); }}
              className="w-8 h-8 rounded-full p-[1.5px] ig-story-gradient cursor-pointer flex-shrink-0"
            >
              <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1px] overflow-hidden">
                <UserAvatar
                  src={post.author_photo_url || post.author_photo || null}
                  username={post.author_username || 'User'}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span
                data-testid={`post-author-${post.id}`}
                onClick={(e) => { e.stopPropagation(); navigate(`/user/${post.author_id}`); }}
                className="font-bold text-[13.5px] text-neutral-950 dark:text-white hover:opacity-80 cursor-pointer truncate flex items-center gap-1"
              >
                {post.author_username}
                {post.author_verified && <VerifiedBadge size="xs" />}
              </span>

              <span className="text-neutral-400 text-xs">•</span>
              <span className="text-neutral-400 dark:text-neutral-500 text-xs shrink-0">
                {timeAgo(post.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Post options"
                  className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-xl p-1 shadow-xl">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()} className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]">
                    <Globe className="w-4 h-4 mr-2 text-neutral-500" />
                    <span>Translate</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-xl p-1">
                    {TRANSLATE_LANGUAGES.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={(e) => { e.stopPropagation(); handleTranslate(lang.code); }}
                        className="cursor-pointer text-xs px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]"
                      >
                        {lang.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {translatedContent && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); setTranslatedContent(null); }}
                    className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    <span>Original Text</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setShowSafetyExplanation(true); }}
                  className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]"
                >
                  <ShieldCheck className="w-4 h-4 mr-2 text-[#0095F6]" />
                  <span>AI Safety Score</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); handleVote('down'); }}
                  className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]"
                >
                  <ThumbsDown className="w-4 h-4 mr-2 text-neutral-400" />
                  <span>Downvote ({downvoteCount})</span>
                </DropdownMenuItem>

                {isAuthor ? (
                  <>
                    <DropdownMenuSeparator className="bg-[#EFEFEF] dark:bg-[#262626] my-1" />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                      className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#1A1A1A]"
                    >
                      <Pencil className="w-4 h-4 mr-2 text-neutral-500" />
                      <span>Edit Post</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                      className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg text-[#ED4956] hover:bg-[#ED4956]/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span>Delete Post</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuSeparator className="bg-[#EFEFEF] dark:bg-[#262626] my-1" />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }}
                      className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-lg text-[#ED4956] hover:bg-[#ED4956]/10"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      <span>Report Post</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Media Carousel / Double Tap Area (Edge-to-edge, perfect aspect ratio) */}
        {post.media && post.media.length > 0 && (
          <div 
            className="relative w-full overflow-hidden bg-black select-none"
            onDoubleClick={handleDoubleTap}
            onClick={(e) => e.stopPropagation()}
          >
            <MediaCarousel
              media={post.media}
              onMediaClick={(item, index) => {
                setSelectedMediaIndex(index);
                setShowFullscreen(true);
              }}
            />

            <AnimatePresence>
              {showHeartPop && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.9] }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center pointer-events-none drop-shadow-2xl z-30"
                >
                  <Heart className="w-24 h-24 text-white fill-[#ED4956]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Developer Code Box */}
        {post.code && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="mx-3.5 my-2 rounded-xl border border-neutral-800 bg-[#0A0A0A] overflow-hidden"
          >
            <div className="px-3.5 py-1.5 bg-[#121212] border-b border-neutral-800 flex items-center justify-between select-none">
              <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase">
                {post.codeLanguage || 'Code'}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-white/5"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : null}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 text-[12px] font-mono text-green-400 overflow-x-auto max-h-[140px] scrollbar-hide">
              <code>{post.code}</code>
            </pre>
          </div>
        )}

        {/* Action Bar (Heart, Comment, Share, Bookmark on Right) */}
        <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              data-testid={`post-upvote-btn-${post.id}`}
              onClick={() => handleVote('up')}
              disabled={voting}
              aria-label="Like post"
              className="p-0.5 text-neutral-900 dark:text-white hover:opacity-70 transition-transform active:scale-125 cursor-pointer"
            >
              <Heart 
                className={`w-6 h-6 transition-colors ${
                  userVote === 'up' 
                    ? 'text-[#ED4956] fill-[#ED4956] animate-heart-pop' 
                    : 'stroke-[1.8px]'
                }`} 
              />
            </button>

            <button
              data-testid={`post-comments-btn-${post.id}`}
              onClick={() => setShowComments(!showComments)}
              aria-label="Comments"
              className="p-0.5 text-neutral-900 dark:text-white hover:opacity-70 transition-transform active:scale-125 cursor-pointer"
            >
              <MessageCircle className="w-6 h-6 stroke-[1.8px] -rotate-6" />
            </button>

            <button
              data-testid={`post-share-btn-${post.id}`}
              onClick={() => setShowShare(true)}
              aria-label="Share"
              className="p-0.5 text-neutral-900 dark:text-white hover:opacity-70 transition-transform active:scale-125 cursor-pointer"
            >
              <Send className="w-6 h-6 stroke-[1.8px] -rotate-12" />
            </button>
          </div>

          <button
            onClick={handleBookmarkClick}
            aria-label="Save post"
            className="p-0.5 text-neutral-900 dark:text-white hover:opacity-70 transition-transform active:scale-125 cursor-pointer"
          >
            <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current text-neutral-900 dark:text-white' : 'stroke-[1.8px]'}`} />
          </button>
        </div>

        {/* Likes Count */}
        <div className="px-3.5 pt-1 text-[13.5px] font-bold text-neutral-900 dark:text-white select-none">
          {upvoteCount > 0 ? (
            <span>{upvoteCount.toLocaleString()} {upvoteCount === 1 ? 'like' : 'likes'}</span>
          ) : (
            <span className="font-normal text-neutral-500 text-xs">Be the first to like this</span>
          )}
        </div>

        {/* Caption & Post Body */}
        <div className="px-3.5 pt-1 pb-1 space-y-1">
          {isProject && post.title && (
            <h3 
              onClick={() => navigate(`/post/${post.id}`)}
              className="font-bold text-[14px] text-neutral-950 dark:text-white hover:text-[#0095F6] cursor-pointer transition-colors"
            >
              {post.title}
            </h3>
          )}

          <div className="text-[13.5px] text-neutral-900 dark:text-neutral-100 leading-snug">
            <span 
              onClick={() => navigate(`/user/${post.author_id}`)}
              className="font-bold mr-1.5 text-neutral-900 dark:text-white cursor-pointer hover:underline"
            >
              {post.author_username}
            </span>
            <ExpandableText text={translatedContent || post.content} maxLines={3}>
              <span className="whitespace-pre-wrap"><LinkifiedText text={translatedContent || post.content} /></span>
            </ExpandableText>
          </div>

          {translatedContent && (
            <div className="flex items-center gap-1 pt-0.5 text-[11px] text-[#0095F6]">
              <Globe className="w-3 h-3" />
              <span>Translated content</span>
              <button 
                onClick={() => setTranslatedContent(null)}
                className="ml-1 underline text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
              >
                See original
              </button>
            </div>
          )}

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  data-testid={`post-hashtag-${tag}`}
                  onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                  className="text-xs font-semibold text-[#0095F6] hover:underline"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {isProject && (post.github_link || post.preview_link) && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {post.github_link && (
                <a
                  href={post.github_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              )}
              {post.preview_link && (
                <a
                  href={post.preview_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0095F6] text-white text-xs font-semibold hover:bg-[#1877F2] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Live Demo</span>
                </a>
              )}
            </div>
          )}

          {extractFirstUrl(post.content) && (
            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
              <UrlPreviewCard url={extractFirstUrl(post.content)} />
            </div>
          )}

          {(post.comment_count || 0) > 0 && (
            <button
              data-testid={`post-comment-count-${post.id}`}
              onClick={() => setShowComments(!showComments)}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 pt-1 cursor-pointer block"
            >
              {showComments ? 'Hide comments' : `View all ${post.comment_count} comments`}
            </button>
          )}

          {/* Inline comment quick input */}
          <form 
            onSubmit={handleQuickCommentSubmit}
            className="flex items-center justify-between pt-1.5 mt-1"
          >
            <input
              type="text"
              value={quickComment}
              onChange={(e) => setQuickComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none py-1"
            />
            {quickComment.trim() && (
              <button
                type="submit"
                disabled={submittingComment}
                className="text-xs font-bold text-[#0095F6] hover:text-[#1877F2] ml-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            )}
          </form>
        </div>

        {/* Comments Section Drawer */}
        {showComments && (
          <div className="border-t border-[#EFEFEF] dark:border-[#262626] bg-neutral-50/50 dark:bg-black/40">
            <CommentsSection
              postId={post.id}
              postAuthorId={post.author_id}
              currentUser={currentUser}
              onAuthRequired={() => setShowAuthModal(true)}
            />
          </div>
        )}
      </article>

      <ShareModal open={showShare} onClose={() => setShowShare(false)} post={post} />
      <EditPostModal open={showEditModal} onClose={() => setShowEditModal(false)} post={post} currentUser={currentUser} onUpdated={onUpdated} />

      {showFullscreen && (
        <FullscreenMedia 
          media={post.media} 
          initialIndex={selectedMediaIndex} 
          onClose={() => setShowFullscreen(false)} 
        />
      )}

      {externalLink && (
        <ExternalLinkModal open={true} onClose={() => setExternalLink(null)} url={externalLink.url} isHttp={externalLink.isHttp} />
      )}

      {previewUser && (
        <UserPreviewModal open={true} onClose={() => setPreviewUser(null)} userId={previewUser} currentUserId={currentUser?.id} currentUser={currentUser} />
      )}

      {showReportModal && (
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="post"
          targetId={post.id}
          targetAuthorId={post.author_id}
          currentUser={currentUser}
          onReportSubmitted={() => setShowReportModal(false)}
        />
      )}

      <Dialog open={showSafetyExplanation} onOpenChange={setShowSafetyExplanation}>
        <DialogContent className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-neutral-900 dark:text-white text-base">
              <ShieldCheck className="w-5 h-5 text-[#0095F6]" />
              <span>Discuss AI Content Review</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <div className="font-bold text-xs mb-1">Status: Verified Safe</div>
              <p className="text-xs leading-relaxed">
                {post.aiSafetyInfo?.reasoning || 'This content meets Discuss community and safety guidelines.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white dark:bg-[#121212] border border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-900 dark:text-white text-base">Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-500 text-xs">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting} 
              className="rounded-xl bg-[#ED4956] hover:bg-[#DC2626] text-white text-xs font-semibold"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GuestAuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
