import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleVote, deletePost } from '@/lib/db';
import { hasNewComments } from '@/lib/commentsDb';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Pencil, Trash2, Github, ExternalLink, Loader2, Hash, MoreVertical, Globe, RotateCcw, ZoomIn, Flag, Bookmark, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import MediaCarousel from '@/components/MediaCarousel';
import FullscreenMedia from '@/components/FullscreenMedia';
import ReportModal from '@/components/ReportModal';
import { hasUserReportedTarget } from '@/lib/reportService';

const TRANSLATE_LANGUAGES = [
  { code: 'kn', label: 'Kannada' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'en', label: 'English' },
];

const LS_PREF_LANG = 'discuss_translate_pref_lang';

const LANG_LABELS = Object.fromEntries(TRANSLATE_LANGUAGES.map(l => [l.code, l.label]));

function getPreferredLang() {
  try { return localStorage.getItem(LS_PREF_LANG) || null; } catch (e) { console.warn('Could not read translation preference:', e); return null; }
}

function setPreferredLang(code) {
  try { if (code) localStorage.setItem(LS_PREF_LANG, code); } catch (e) { console.warn('Could not save translation preference:', e); }
}

const POST_URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

const TRANSLATE_API_BASE = 'https://translate.googleapis.com/translate_a/single';

async function translatePostContent(text, targetLang) {
  const urls = [];
  // Replace URLs with numbered placeholders so they are not translated
  const textWithPlaceholders = text.replace(POST_URL_REGEX, (match) => {
    const idx = urls.length;
    urls.push(match);
    return `[LINK_${idx}]`;
  });
  // Reset lastIndex on the shared global regex after use
  POST_URL_REGEX.lastIndex = 0;

  const res = await fetch(
    `${TRANSLATE_API_BASE}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(textWithPlaceholders)}`
  );
  if (!res.ok) throw new Error(`Translation failed (HTTP ${res.status})`);

  const data = await res.json();
  // Google Translate gtx response: data[0] is an array of [translatedSegment, originalSegment, ...] tuples
  let translated = data[0].map(s => s[0]).join('');

  // Restore original URLs using string replacement to avoid regex construction in a loop
  urls.forEach((url, i) => {
    translated = translated.split(`[LINK_${i}]`).join(url);
  });

  return translated;
}

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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, currentUser, onDeleted, onUpdated, onVoteChanged, onTagClick, isSelectable = false, isSelected = false, onSelectToggle }) {
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);

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
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [voting, setVoting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [externalLink, setExternalLink] = useState(null);
  const [previewUser, setPreviewUser] = useState(null);
  const [hasNewCommentBadge, setHasNewCommentBadge] = useState(false);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translatedLang, setTranslatedLang] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [preferredLang, setPreferredLangState] = useState(() => getPreferredLang());
  const [showLangPrompt, setShowLangPrompt] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedLocally, setReportedLocally] = useState(false);

  useEffect(() => {
    setReportedLocally(hasUserReportedTarget(post.id));
  }, [post.id]);

  const isAuthor = currentUser?.id === post.author_id;
  const isProject = post.type === 'project';
  const hashtags = post.hashtags || [];
  const userVote = (post.votes || {})[currentUser?.id] || null;
  const upvoteCount = post.upvote_count || 0;
  const downvoteCount = post.downvote_count || 0;

  // Check for new comment badge (only for post author) - real-time
  useEffect(() => {
    if (!isAuthor || !currentUser?.id) {
      setHasNewCommentBadge(false);
      return;
    }
    
    // Import and subscribe to real-time updates
    const { secondaryDatabase, ref, onValue, off } = require('@/lib/firebaseSecondary');
    const badgeRef = ref(secondaryDatabase, `commentBadges/${currentUser.id}/${post.id}`);
    
    const handleBadge = (snapshot) => {
      setHasNewCommentBadge(snapshot.exists() && Object.keys(snapshot.val() || {}).length > 0);
    };
    
    onValue(badgeRef, handleBadge);
    return () => off(badgeRef);
  }, [post.id, currentUser?.id, isAuthor]);

  // Clear badge when comments are viewed
  const handleBadgeClear = useCallback(() => {
    setHasNewCommentBadge(false);
  }, []);

  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleUsernameClick = (e) => {
    e.stopPropagation();
    if (post.author_id === currentUser?.id) {
      navigate('/profile');
    } else {
      setPreviewUser(post.author_id);
    }
  };

  const handleExternalLink = (url, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const isHttp = url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://');
    setExternalLink({ url, isHttp });
  };

  const handleVote = async (voteType) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (voting) return;
    setVoting(true);
    try {
      const data = await toggleVote(post.id, voteType, currentUser.id);
      onVoteChanged(post.id, data);
    } catch (err) {
      if (err.message?.includes('below 0')) {
        toast.error('Vote score cannot go below 0');
      }
    } finally { 
      setVoting(false); 
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { 
      await deletePost(post.id, currentUser.id); 
      onDeleted(post.id); 
      toast.success('Post deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete post');
    } finally { 
      setDeleting(false); 
      setShowDeleteConfirm(false); 
    }
  };

  const handleTranslate = async (targetLang) => {
    if (translating) return;
    const contentToTranslate = post.content;
    if (!contentToTranslate) return;
    setTranslating(true);
    try {
      const result = await translatePostContent(contentToTranslate, targetLang);
      setTranslatedContent(result);
      setTranslatedLang(targetLang);
      toast.success(`Translated to ${LANG_LABELS[targetLang]}`);
    } catch (err) {
      toast.error('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleResetTranslation = () => {
    setTranslatedContent(null);
    setTranslatedLang(null);
  };

  const handleTranslateClick = (e) => {
    if (e) e.stopPropagation();
    if (translating) return;
    if (translatedContent) { handleResetTranslation(); return; }
    const pref = preferredLang || getPreferredLang();
    if (pref) {
      handleTranslate(pref);
    } else {
      setShowLangPrompt(true);
    }
  };

  const handleReportClick = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (reportedLocally) {
      toast.warning('You have already submitted a report for this post.');
      return;
    }
    setShowReportModal(true);
  };

  const handleLangPromptSelect = (code) => {
    setPreferredLang(code);
    setPreferredLangState(code);
    setShowLangPrompt(false);
    handleTranslate(code);
  };

  const handleLangPromptSkip = () => {
    setShowLangPrompt(false);
  };

  return (
    <div data-testid={`post-card-${post.id}`} className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] rounded-[12px] shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden flex">
      
      {/* Left side voting panel for desktop only */}
      <div className="hidden lg:flex flex-col items-center gap-1 px-2.5 py-4 bg-neutral-50/50 dark:bg-neutral-900/10 discuss:bg-black/10 border-r border-neutral-100 dark:border-neutral-800 discuss:border-[#262626] w-11 shrink-0 select-none">
        <button
          onClick={(e) => { e.stopPropagation(); handleVote('up'); }}
          disabled={voting}
          className={`p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 discuss:hover:bg-[#262626] transition-colors cursor-pointer ${
            userVote === 'up' ? 'text-[#EF4444]' : 'text-neutral-400 dark:text-neutral-500'
          }`}
          title="Upvote"
        >
          <ChevronUp className="w-5 h-5 font-black" />
        </button>
        <span className={`text-[13px] font-extrabold ${userVote === 'up' ? 'text-[#EF4444]' : userVote === 'down' ? 'text-[#2563EB]' : 'text-neutral-800 dark:text-neutral-200 discuss:text-[#F5F5F5]'}`}>
          {upvoteCount - downvoteCount}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleVote('down'); }}
          disabled={voting}
          className={`p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 discuss:hover:bg-[#262626] transition-colors cursor-pointer ${
            userVote === 'down' ? 'text-[#2563EB]' : 'text-neutral-400 dark:text-neutral-500'
          }`}
          title="Downvote"
        >
          <ChevronDown className="w-5 h-5 font-black" />
        </button>
      </div>

      {isSelectable && (
        <div 
          onClick={(e) => { e.stopPropagation(); onSelectToggle?.(post.id); }}
          className="flex items-center justify-center px-4 bg-neutral-50/50 dark:bg-neutral-800/40 discuss:bg-black/20 border-r border-neutral-200 dark:border-neutral-700/50 discuss:border-white/5 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/80 discuss:hover:bg-black/40 transition-colors shrink-0"
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // Controlled by parent container click
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-[#2563EB] discuss:text-[#EF4444] focus:ring-[#2563EB]/20 dark:bg-neutral-900 cursor-pointer"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Content area */}
        <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span data-testid={`post-badge-${post.id}`}
              className={isProject
                ? 'bg-[#6275AF]/10 text-[#6275AF] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444] border border-[#6275AF]/20 discuss:border-[#EF4444]/20 px-2.5 py-0.5 text-xs font-semibold rounded-[6px] shrink-0'
                : 'bg-[#2563EB]/10 text-[#2563EB] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444] dark:text-[#60A5FA] border border-[#2563EB]/20 discuss:border-[#EF4444]/20 px-2.5 py-0.5 text-xs font-semibold rounded-[6px] shrink-0'
              }>
              <span>{isProject ? 'Project' : 'Discussion'}</span>
            </span>
            <span
              data-testid={`post-author-${post.id}`}
              onClick={handleUsernameClick}
              className="font-semibold text-[#2563EB] discuss:text-[#F5F5F5] discuss:hover:text-[#EF4444] hover:underline text-[13px] md:text-[15px] cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>{post.author_username}</span>
              {post.author_verified && <VerifiedBadge size="xs" />}
            </span>
            <span className="text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] text-xs shrink-0"><span>{timeAgo(post.timestamp)}</span></span>
          </div>
          <div className="flex items-center shrink-0">
            {!currentUser && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                className="mr-2 px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-[#0f172a] dark:bg-[#1e293b] discuss:bg-[#1e3a8a] text-white rounded-md shadow-sm hover:opacity-90 transition-opacity"
              >
                Join Now
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button onClick={(e) => e.stopPropagation()} aria-label={translating ? 'Translating…' : 'Post options'} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-400 discuss:text-[#9CA3AF] hover:text-neutral-900 dark:hover:text-white discuss:hover:text-[#F5F5F5] transition-colors focus:outline-none">
                  {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()} className="cursor-pointer flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] text-xs">
                    <Globe className="w-3.5 h-3.5" /> <span>Translate</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]">
                    {TRANSLATE_LANGUAGES.map((lang) => (
                      <DropdownMenuItem key={lang.code} onClick={(e) => { e.stopPropagation(); handleTranslate(lang.code); }} className="cursor-pointer text-xs text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626]">
                        <span>{lang.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {translatedContent && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResetTranslation(); }} className="cursor-pointer flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> <span>Back to Original</span>
                  </DropdownMenuItem>
                )}
                {isAuthor && (
                  <>
                    <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }} className="cursor-pointer flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] text-xs">
                      <Pencil className="w-3.5 h-3.5" /> <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="cursor-pointer flex items-center gap-2 text-[#EF4444] focus:text-[#EF4444] hover:bg-[#EF4444]/10 text-xs">
                      <Trash2 className="w-3.5 h-3.5" /> <span>Delete</span>
                    </DropdownMenuItem>
                  </>
                )}
                {!isAuthor && (
                  <>
                    <DropdownMenuSeparator className="bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333]" />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReportClick(); }} className="cursor-pointer flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] text-xs font-semibold">
                      <Flag className={`w-3.5 h-3.5 ${reportedLocally ? 'text-red-500 fill-current' : ''}`} />
                      <span>{reportedLocally ? 'Reported' : 'Report Post'}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body - clickable to open post detail */}
        <div
          data-testid={`post-clickable-${post.id}`}
          onClick={handlePostClick}
          className="cursor-pointer"
        >
          {isProject && post.title && (
            <h3 data-testid={`post-title-${post.id}`} className="font-semibold text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-[15px] md:text-[17px] mb-1.5 leading-snug hover:text-[#2563EB] dark:hover:text-[#60A5FA] discuss:hover:text-[#EF4444] transition-colors"><span>{post.title}</span></h3>
          )}
          <div data-testid={`post-content-${post.id}`} className="text-neutral-700 dark:text-neutral-200 discuss:text-[#E5E7EB] text-[13px] md:text-[15px] leading-relaxed">
            <ExpandableText text={translatedContent || post.content} maxLines={5}>
              <span className="whitespace-pre-wrap"><LinkifiedText text={translatedContent || post.content} /></span>
            </ExpandableText>
            {translatedContent && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Globe className="w-3 h-3 text-neutral-400 discuss:text-[#9CA3AF] shrink-0" />
                <span className="text-[11px] text-neutral-400 discuss:text-[#9CA3AF]"><span>Translated to {LANG_LABELS[translatedLang]}</span></span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResetTranslation(); }}
                  className="text-[11px] text-[#2563EB] discuss:text-[#60A5FA] hover:underline ml-1"
                >
                  <span>Back to Original</span>
                </button>
              </div>
            )}
          </div>

          {/* Media Carousel */}
          {post.media && post.media.length > 0 && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <MediaCarousel 
                media={post.media} 
                onMediaClick={(item, index) => {
                  setSelectedMediaIndex(index);
                  setShowFullscreen(true);
                }}
              />
            </div>
          )}

          {/* URL Preview Card — stop propagation so click opens the link, not the post */}
          {extractFirstUrl(post.content) && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <UrlPreviewCard url={extractFirstUrl(post.content)} />
            </div>
          )}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
              {hashtags.map((tag) => (
                <button key={tag} data-testid={`post-hashtag-${tag}`} onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
                  className="inline-flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] hover:bg-[#2563EB]/10 discuss:hover:bg-[#333333] px-2.5 py-1 rounded-[6px] text-xs font-medium text-neutral-600 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:text-[#2563EB] discuss:hover:text-[#F5F5F5] transition-colors">
                  <Hash className="w-3 h-3" /><span>{tag}</span>
                </button>
              ))}
            </div>
          )}

          {isProject && (post.github_link || post.preview_link) && (
            <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              {post.github_link && (
                <button onClick={(e) => handleExternalLink(post.github_link, e)} data-testid={`post-github-link-${post.id}`}
                  className="inline-flex items-center gap-1.5 bg-neutral-900 dark:bg-neutral-100 discuss:bg-[#262626] text-white dark:text-neutral-900 discuss:text-[#F5F5F5] px-3 py-1.5 rounded-[6px] text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 discuss:hover:bg-[#333333] transition-colors">
                  <Github className="w-3.5 h-3.5" /> <span>GitHub</span>
                </button>
              )}
              {post.preview_link && (
                <button onClick={(e) => handleExternalLink(post.preview_link, e)} data-testid={`post-preview-link-${post.id}`}
                  data-primary="true"
                  className="inline-flex items-center gap-1.5 bg-[#2563EB] discuss:bg-[#EF4444] text-white discuss:text-white px-3 py-1.5 rounded-[6px] text-xs font-medium hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] shadow-button transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> <span>Live Preview</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-2 px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 discuss:border-[#333333]"
      >
        {/* Mobile Upvote Button (hidden on desktop) */}
        <button 
          data-testid={`post-upvote-btn-${post.id}`} 
          onClick={() => handleVote('up')} 
          disabled={voting}
          className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all ${
            userVote === 'up' 
              ? 'bg-[#10B981]/10 text-[#10B981] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444] border border-[#10B981]/30 discuss:border-[#EF4444]/30' 
              : 'text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-[#10B981]/5 hover:text-[#10B981] discuss:hover:bg-[#262626] discuss:hover:text-[#F5F5F5] border border-transparent'
          }`}
        >
          <ThumbsUp className="w-4 h-4" fill={userVote === 'up' ? 'currentColor' : 'none'} />
          <span data-testid={`post-upvote-count-${post.id}`}><span>{upvoteCount}</span></span>
        </button>

        {/* Mobile Downvote Button (hidden on desktop) */}
        <button 
          data-testid={`post-downvote-btn-${post.id}`} 
          onClick={() => handleVote('down')} 
          disabled={voting}
          className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all ${
            userVote === 'down' 
              ? 'bg-[#EF4444]/10 text-[#EF4444] discuss:bg-[#EF4444]/10 discuss:text-[#EF4444] border border-[#EF4444]/30 discuss:border-[#EF4444]/30' 
              : 'text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-[#EF4444]/5 hover:text-[#EF4444] discuss:hover:bg-[#262626] discuss:hover:text-[#F5F5F5] border border-transparent'
          }`}
        >
          <ThumbsDown className="w-4 h-4" fill={userVote === 'down' ? 'currentColor' : 'none'} />
          <span data-testid={`post-downvote-count-${post.id}`}><span>{downvoteCount}</span></span>
        </button>

        <div className="lg:hidden w-px h-4 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] mx-1" />

        <button data-testid={`post-comments-btn-${post.id}`} onClick={() => setShowComments(!showComments)}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white discuss:hover:text-[#F5F5F5] transition-colors cursor-pointer">
          <MessageSquare className="w-4 h-4" />
          <span data-testid={`post-comment-count-${post.id}`}><span>{post.comment_count || 0}</span></span>
          {hasNewCommentBadge && !showComments && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-pulse" />
          )}
        </button>

        <button data-testid={`post-share-btn-${post.id}`} onClick={() => setShowShare(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] hover:bg-neutral-100 dark:hover:bg-neutral-700 discuss:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white discuss:hover:text-[#F5F5F5] transition-colors cursor-pointer">
          <Share2 className="w-4 h-4" />
          <span><span>Share</span></span>
        </button>

        <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 discuss:bg-[#333333] mx-1" />

        {/* Always-visible Translate button */}
        <button
          data-testid={`post-translate-btn-${post.id}`}
          onClick={handleTranslateClick}
          disabled={translating}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold transition-all border cursor-pointer ${
            translatedContent
              ? 'bg-neutral-100 dark:bg-neutral-700 discuss:bg-[#262626] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] border-neutral-300 dark:border-neutral-600 discuss:border-[#444444] hover:bg-neutral-200 dark:hover:bg-neutral-600 discuss:hover:bg-[#333333]'
              : 'bg-[#2563EB]/10 discuss:bg-[#EF4444]/10 text-[#2563EB] discuss:text-[#EF4444] border-[#2563EB]/30 discuss:border-[#EF4444]/30 hover:bg-[#2563EB]/20 discuss:hover:bg-[#EF4444]/20'
          }`}
          title={translatedContent ? 'Back to Original' : preferredLang ? `Translate to ${LANG_LABELS[preferredLang]}` : 'Translate'}
        >
          {translating
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : translatedContent
              ? <RotateCcw className="w-3.5 h-3.5" />
              : <Globe className="w-3.5 h-3.5" />
          }
          <span className="hidden sm:inline">
            {translatedContent ? 'Original' : 'Translate'}
          </span>
        </button>

        {/* Dynamic O(1) Local Storage Auth-Guarded Bookmark Button (styled as Save on desktop) */}
        <button
          onClick={handleBookmarkClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-all duration-200 active:scale-90 hover:scale-105 border lg:border-transparent ml-auto focus:outline-none cursor-pointer
            ${isBookmarked
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.15)] lg:shadow-none animate-pulse-subtle'
              : 'bg-white/5 lg:bg-transparent border-white/10 lg:border-transparent text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF] hover:text-[#2563EB] dark:hover:text-blue-400 discuss:hover:text-[#EF4444] lg:hover:bg-neutral-100 lg:dark:hover:bg-neutral-700 lg:discuss:hover:bg-[#262626]'
            }`}
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Post'}
        >
          <Bookmark className="w-4.5 h-4.5" fill={isBookmarked ? 'currentColor' : 'none'} />
          <span className="hidden lg:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {showComments && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <CommentsSection postId={post.id} postAuthorId={post.author_id} currentUser={currentUser} onBadgeClear={handleBadgeClear} onAuthRequired={() => setShowAuthModal(true)} />
        </div>
      )}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="dark:bg-neutral-800 dark:border-neutral-700 discuss:bg-[#1a1a1a] discuss:border-[#333333] rounded-[12px]">
          <AlertDialogHeader><AlertDialogTitle className="dark:text-neutral-50 discuss:text-[#F5F5F5]">Delete post?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-neutral-400 discuss:text-[#9CA3AF]">This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`post-delete-cancel-${post.id}`} className="rounded-[6px] dark:bg-neutral-700 dark:text-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-600 discuss:bg-[#262626] discuss:text-[#F5F5F5] discuss:border-[#333333]">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid={`post-delete-confirm-${post.id}`} onClick={handleDelete} disabled={deleting} className="rounded-[6px] bg-[#EF4444] text-white hover:bg-[#DC2626] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626]">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Language preference prompt — shown on first Translate click */}
      <Dialog open={showLangPrompt} onOpenChange={setShowLangPrompt}>
        <DialogContent className="max-w-xs rounded-[14px] bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5]">
              <Globe className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
              Choose your language
            </DialogTitle>
            <DialogDescription className="text-[13px] text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1">
              Set a preferred translation language. You can change it anytime from the post menu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {TRANSLATE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLangPromptSelect(lang.code)}
                className="w-full text-left px-4 py-2.5 rounded-[8px] text-[13px] font-medium border border-neutral-200 dark:border-neutral-600 discuss:border-[#333333] text-neutral-700 dark:text-neutral-200 discuss:text-[#F5F5F5] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10 hover:text-[#2563EB] discuss:hover:text-[#EF4444] hover:border-[#2563EB]/40 discuss:hover:border-[#EF4444]/40 transition-colors"
              >
                {lang.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleLangPromptSkip}
            className="w-full mt-2 text-center text-[12px] text-neutral-400 discuss:text-[#9CA3AF] hover:text-neutral-600 discuss:hover:text-[#F5F5F5] transition-colors py-1"
          >
            Skip — choose manually each time
          </button>
        </DialogContent>
      </Dialog>
      
      <GuestAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={post.type}
        targetId={post.id}
        targetTitleOrName={post.title || post.content}
        targetOwnerId={post.author_id}
        currentUser={currentUser}
        onReportSuccess={() => setReportedLocally(true)}
      />
    </div>
    </div>
  );
}
