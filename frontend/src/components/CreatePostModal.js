import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageSquare,
  FolderGit2,
  Loader2,
  X,
  PlayCircle,
  Video,
  Image as ImageIcon,
  AlertCircle,
  AlertOctagon,
} from 'lucide-react';
import { toast } from 'sonner';
import { evaluatePostSafety } from '@/lib/safetyService';
import MediaUpload from '@/components/MediaUpload';
import { createPulse } from '@/lib/pulseDb';
import UserAvatar from '@/components/UserAvatar';
import { playPublishSound } from '@/lib/interactionFeedback';
import HashtagAutocomplete from '@/components/HashtagAutocomplete';
import {
  extractInlineHashtags,
  getActiveHashtagToken,
  replaceHashtagToken,
  queryHashtagSuggestions,
  recordHashtagsUsage,
} from '@/lib/hashtagService';

export default function CreatePostModal({ open, onClose, onCreated, initialType = 'discussion' }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState(initialType);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPostType(initialType);
    }
  }, [open, initialType]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [media, setMedia] = useState([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [safetyWarning, setSafetyWarning] = useState(null);

  // Hashtag autocomplete state
  const [activeToken, setActiveToken] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef(null);

  const reset = () => {
    setPostType('discussion');
    setTitle('');
    setContent('');
    setGithubLink('');
    setPreviewLink('');
    setMedia([]);
    setError('');
    setShowCode(false);
    setCode('');
    setCodeLanguage('javascript');
    setActiveToken(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSafetyWarning(null);
  };

  // Inline hashtags analysis
  const { validTags, allTags, hasExceededLimit } = extractInlineHashtags(content);

  const checkHashtagAutocomplete = useCallback((text, cursor) => {
    const token = getActiveHashtagToken(text, cursor);
    setActiveToken(token);

    if (token) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(async () => {
        const results = await queryHashtagSuggestions(token.query);
        setSuggestions(results);
        setSelectedSuggestionIndex(0);
        setShowSuggestions(results.length > 0);
      }, 150);
    } else {
      setShowSuggestions(false);
    }
  }, []);

  const handleContentChange = (e) => {
    const val = e.target.value;
    if (postType === 'pulse' && val.length > 150) return;
    setContent(val);
    const cursor = e.target.selectionStart;
    checkHashtagAutocomplete(val, cursor);
  };

  const handleSelectSuggestion = (tag) => {
    if (!activeToken) return;
    const { newText, newCursorPosition } = replaceHashtagToken(content, activeToken.range, tag);
    setContent(newText);
    setShowSuggestions(false);
    setActiveToken(null);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 10);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (suggestions[selectedSuggestionIndex]) {
        handleSelectSuggestion(suggestions[selectedSuggestionIndex].tag);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const doPublish = async () => {
    setLoading(true);
    setSafetyWarning(null);
    try {
      if (postType === 'pulse') {
        const pulseId = await createPulse(
          user.id || user.uid,
          user.username || user.displayName || user.email?.split('@')[0],
          user.photo_url || user.photoURL || '',
          media[0],
          content.trim()
        );
        onCreated({ id: pulseId, type: 'pulse' });
      } else {
        const newPost = await createPost(
          {
            type: postType,
            title: postType === 'project' ? title.trim() : '',
            content: content.trim(),
            media,
            github_link: postType === 'project' ? githubLink.trim() : '',
            preview_link: postType === 'project' ? previewLink.trim() : '',
            hashtags: validTags,
            code: postType === 'discussion' && showCode ? code.trim() : '',
            codeLanguage: postType === 'discussion' && showCode ? codeLanguage : '',
          },
          user
        );
        onCreated(newPost);
      }

      // Record hashtags in local cache
      if (validTags.length > 0) {
        recordHashtagsUsage(validTags);
      }

      reset();
      playPublishSound();
      toast.success(postType === 'pulse' ? 'Pulse published!' : 'Post shared!');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (postType === 'project' && !title.trim()) {
      return setError('Project title is required');
    }
    if (postType === 'pulse' && media.length === 0) {
      return setError('A video is required for Pulse');
    }
    if (postType !== 'pulse') {
      if (content.trim().length < 2) {
        return setError('Content must be at least 2 characters.');
      }
      if (content.length > 600) {
        return setError('Content cannot exceed 600 characters.');
      }
      if (hasExceededLimit) {
        return setError('You can add up to 5 hashtags per post.');
      }
    }

    // Pre-publish safety advisory (strict 1200ms UX budget; never delays posting indefinitely)
    if (postType !== 'pulse' && !safetyWarning) {
      try {
        const safetyPromise = evaluatePostSafety(content.trim(), showCode ? code.trim() : '');
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));
        const safety = await Promise.race([safetyPromise, timeoutPromise]);
        if (safety && safety.status === 'high_risk') {
          setSafetyWarning({
            summary: safety.summary || 'This post may contain content that conflicts with Discuss community guidelines. You can review it before publishing.',
            categories: safety.categories || [],
          });
          return;
        }
      } catch (_) {
        // AI check errors never block publishing
      }
    }

    await doPublish();
  };

  const placeholderText =
    postType === 'project'
      ? 'Describe your project with natural #hashtags inline...'
      : postType === 'pulse'
      ? 'Add a caption for your Pulse video...'
      : "What's on your mind? Type thoughts and #hashtags naturally...";

  const labelText =
    postType === 'project' ? 'Description' : postType === 'pulse' ? 'Caption' : "What's on your mind?";

  // Publish button label
  const publishButtonText =
    postType === 'pulse'
      ? 'Publish Pulse'
      : postType === 'project'
      ? 'Share Project'
      : 'Share Discussion';

  // Validation rules for disabling publish button
  const isPublishDisabled =
    loading ||
    isUploadingMedia ||
    (postType === 'pulse' && media.length === 0) ||
    (postType === 'project' && (!title.trim() || content.trim().length < 2 || content.length > 600 || hasExceededLimit)) ||
    (postType === 'discussion' && (content.trim().length < 2 || content.length > 600 || hasExceededLimit));

  // Character counter color logic
  const getCharCountClass = (len) => {
    if (len > 600) return 'text-red-500 font-bold';
    if (len >= 591) return 'text-red-500 font-bold';
    if (len >= 561) return 'text-amber-500 dark:text-amber-400 font-semibold';
    if (len >= 501) return 'text-neutral-700 dark:text-neutral-300 font-medium';
    return 'text-neutral-400 dark:text-neutral-500';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent
        hideClose
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-xl bg-white dark:bg-black border-[#DBDBDB] dark:border-[#262626] rounded-t-[24px] sm:rounded-[24px] max-h-[92dvh] overflow-y-auto overflow-x-hidden p-0 shadow-[0_24px_80px_rgba(0,0,0,0.25)] [&::-webkit-scrollbar]:hidden"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        <DialogHeader className="sticky top-0 z-20 flex-row items-center justify-between space-y-0 px-5 py-4 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-[#EFEFEF] dark:border-[#262626]">
          <DialogTitle className="text-[17px] font-bold text-neutral-900 dark:text-white">Create</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close create post"
              className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-[#0095F6]/30 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {/* User Identity */}
          <div className="flex items-center gap-3">
            <UserAvatar
              src={user?.photo_url || user?.photoURL}
              username={user?.username || user?.displayName}
              userId={user?.id}
              priority
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-[14px] font-bold text-neutral-900 dark:text-white">
                {user?.username || user?.displayName || 'Developer'}
              </p>
              <p className="text-[11px] text-neutral-500">Share with the Discuss community</p>
            </div>
          </div>

          {error && (
            <div
              data-testid="create-post-error"
              className="flex items-center gap-2 bg-[#ED4956]/8 rounded-xl p-3 text-[#ED4956] text-[13px] font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selector - Flat, clean, monochrome */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
            <button
              type="button"
              data-testid="create-post-type-discussion"
              onClick={() => { setPostType('discussion'); setShowSuggestions(false); }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all ${
                postType === 'discussion'
                  ? 'bg-white dark:bg-black text-neutral-950 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <MessageSquare className="w-4 h-4 stroke-[2px]" />
              <span className="text-[12px] sm:text-[13px]">Discussion</span>
            </button>

            <button
              type="button"
              data-testid="create-post-type-project"
              onClick={() => { setPostType('project'); setShowSuggestions(false); }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all ${
                postType === 'project'
                  ? 'bg-white dark:bg-black text-neutral-950 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <FolderGit2 className="w-4 h-4 stroke-[2px]" />
              <span className="text-[12px] sm:text-[13px]">Project</span>
            </button>

            <button
              type="button"
              data-testid="create-post-type-pulse"
              onClick={() => { setPostType('pulse'); setShowSuggestions(false); }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all ${
                postType === 'pulse'
                  ? 'bg-white dark:bg-black text-neutral-950 dark:text-white shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium'
              }`}
            >
              <PlayCircle className="w-4 h-4 stroke-[2px]" />
              <span className="text-[12px] sm:text-[13px]">Pulse</span>
            </button>
          </div>

          {/* Project Title (Only for Project posts) */}
          {postType === 'project' && (
            <div className="space-y-1.5">
              <Label className="text-neutral-800 dark:text-neutral-200 text-xs font-semibold">
                Project Title
              </Label>
              <Input
                data-testid="create-post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your project name"
                className="h-10 bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 dark:text-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 rounded-xl text-sm"
              />
            </div>
          )}


          {/* Main Content / Description / Caption */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">
                {labelText}
              </Label>
              {postType === 'pulse' ? (
                <span className={`text-xs ${content.length > 150 ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                  {content.length}/150
                </span>
              ) : (
                <span className={`text-xs tabular-nums ${getCharCountClass(content.length)}`}>
                  {content.length} / 600
                </span>
              )}
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                data-testid="create-post-content"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onClick={(e) => checkHashtagAutocomplete(content, e.target.selectionStart)}
                onKeyUp={(e) => checkHashtagAutocomplete(content, e.target.selectionStart)}
                placeholder={placeholderText}
                rows={postType === 'discussion' ? 5 : 3}
                className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 shadow-none px-0 py-1.5 text-[15px] sm:text-base leading-relaxed text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none"
              />

              {/* Hashtag Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <HashtagAutocomplete
                  suggestions={suggestions}
                  selectedIndex={selectedSuggestionIndex}
                  onSelect={handleSelectSuggestion}
                  className="top-full mt-1.5 left-2"
                />
              )}
            </div>

            {/* Calm inline feedback when hashtag limit exceeded */}
            {hasExceededLimit && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-in fade-in duration-200">
                You can add up to 5 hashtags per post.
              </p>
            )}

            {/* Subtle helper note showing detected valid tags if any */}
            {validTags.length > 0 && !hasExceededLimit && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Tags ({validTags.length}/5):</span>
                {validTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center text-[11px] font-semibold text-neutral-800 dark:text-neutral-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>


          {/* Code Support (Discussion only) */}
          {postType === 'discussion' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs font-bold text-[#0095F6] dark:text-[#60A5FA] hover:underline flex items-center gap-1.5 select-none"
                >
                  {showCode ? 'Remove Code Support (-)' : 'Add Code Support (+)'}
                </button>
              </div>

              {showCode && (
                <div className="bg-neutral-900 dark:bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3 animate-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-[12px] font-bold text-neutral-400">Language / Stack</Label>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="bg-neutral-800 border-none text-xs font-bold text-neutral-200 p-1.5 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="cpp">C++</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="java">Java</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={code.split('\n').filter(Boolean).length >= 60 ? 'text-red-500 animate-pulse' : 'text-neutral-500'}>
                        Lines: {code.split('\n').filter(Boolean).length} / 60
                      </span>
                      <span className={code.length >= 3000 ? 'text-red-500 animate-pulse' : 'text-neutral-500'}>
                        Characters: {code.length} / 3000
                      </span>
                    </div>

                    <textarea
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value;
                        const lineCount = val.split('\n').length;
                        if (lineCount <= 60 && val.length <= 3000) {
                          setCode(val);
                        } else {
                          toast.error('Limit reached: Code snippet cannot exceed 60 lines or 3,000 characters');
                        }
                      }}
                      placeholder="// Write or paste your code snippet here..."
                      rows={5}
                      className="w-full bg-neutral-950 border border-neutral-800/80 rounded-lg p-3 text-xs font-mono text-green-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Upload Section */}
          <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
            <Label className="text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2">
              {postType === 'pulse' ? (
                <>
                  <Video className="w-4 h-4 text-neutral-700 dark:text-neutral-300" /> <span>Video Upload</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" /> <span>Media</span>
                </>
              )}
            </Label>

            <MediaUpload
              type={postType === 'pulse' ? 'video' : 'image'}
              folder={postType === 'pulse' ? 'pulse' : 'posts'}
              multiple={postType !== 'pulse'}
              maxFiles={postType === 'pulse' ? 1 : 4}
              onUploadingChange={setIsUploadingMedia}
              onUploadComplete={(result) => {
                const newMedia = Array.isArray(result) ? result : [result];
                setMedia((prev) => {
                  const combined = [...prev, ...newMedia];
                  if (postType !== 'pulse' && combined.length > 4) {
                    toast.error('You can only attach up to 4 files per post.');
                    return combined.slice(0, 4);
                  }
                  return combined;
                });
                toast.success('Media uploaded successfully!');
              }}
            />

            {media.length > 0 && (
              <div className={`mt-2.5 flex flex-wrap gap-2 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-xl ${postType === 'pulse' ? 'justify-center' : ''}`}>
                {media.map((m, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-lg overflow-hidden group border border-neutral-200 dark:border-neutral-800 ${
                      postType === 'pulse' ? 'w-full max-w-[200px] aspect-[9/16]' : 'w-16 h-16'
                    }`}
                  >
                    {m.type === 'video' || m.format === 'mp4' || m.url?.includes('video') ? (
                      <video src={m.url} className="w-full h-full object-cover bg-black" controls={postType === 'pulse'} playsInline />
                    ) : (
                      <img src={m.thumbnail || m.url} alt="media" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => prev.filter((_, i) => i !== idx))}
                      className={`absolute ${
                        postType === 'pulse' ? 'top-2 right-2 p-1' : 'top-1 right-1 p-0.5'
                      } bg-black/60 hover:bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10`}
                    >
                      <X size={postType === 'pulse' ? 16 : 12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Links (Project only) */}
          {postType === 'project' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-neutral-800 dark:text-neutral-200 text-xs font-semibold">
                  GitHub Link
                </Label>
                <Input
                  data-testid="create-post-github"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="h-10 bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 dark:text-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-neutral-800 dark:text-neutral-200 text-xs font-semibold">
                  Live Preview Link
                </Label>
                <Input
                  data-testid="create-post-preview"
                  value={previewLink}
                  onChange={(e) => setPreviewLink(e.target.value)}
                  placeholder="https://your-app.com"
                  className="h-10 bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 dark:text-white focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          {/* Pre-Publish Safety Notice (Non-blocking) */}
          {safetyWarning && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-neutral-800 dark:text-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Community Guidelines Notice</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
                {safetyWarning.summary || 'This post may contain content that conflicts with Discuss community guidelines. You can review it before publishing.'}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSafetyWarning(null)}
                  className="text-xs h-8 px-3 rounded-lg border-neutral-300 dark:border-neutral-700"
                >
                  Edit post
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={doPublish}
                  className="text-xs h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Post anyway
                </Button>
              </div>
            </div>
          )}

          {/* Context-Sensitive Publish Button */}
          <Button
            type="submit"
            data-testid="create-post-submit"
            disabled={isPublishDisabled}
            className="w-full h-11 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 rounded-xl font-bold shadow-xs active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Publishing…
              </>
            ) : isUploadingMedia ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading media…
              </>
            ) : (
              publishButtonText
            )}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
