import { useState, useEffect, useRef } from 'react';
import { updatePost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import MediaUpload from '@/components/MediaUpload';
import { extractInlineHashtags, recordHashtagsUsage } from '@/lib/hashtagService';

export default function EditPostModal({ open, onClose, post, currentUser, onUpdated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Grandfathered legacy post length limit
  // If post was already > 600 characters, allow editing up to its saved length, but not beyond.
  // Once reduced to 600 or below, 600 applies permanently.
  const [maxAllowedLength, setMaxAllowedLength] = useState(600);

  const isProject = post?.type === 'project';

  useEffect(() => {
    if (post) {
      const initialContent = post.content || '';
      setTitle(post.title || '');
      setContent(initialContent);
      setGithubLink(post.github_link || '');
      setPreviewLink(post.preview_link || '');
      setMedia(post.media || []);
      setError('');
      setMaxAllowedLength(Math.max(600, initialContent.length));
    }
  }, [post]);

  const reset = () => {
    setTitle('');
    setContent('');
    setGithubLink('');
    setPreviewLink('');
    setMedia([]);
    setError('');
    setMaxAllowedLength(600);
  };

  const handleRemoveMedia = (indexToRemove) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    // If the content was previously > 600, but is now reduced to <= 600, lock at 600
    if (val.length <= 600 && maxAllowedLength > 600) {
      setMaxAllowedLength(600);
    }
    setContent(val);
  };

  const { validTags, hasExceededLimit } = extractInlineHashtags(content);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isProject && !title.trim()) {
      return setError('Project title is required');
    }
    if (!content.trim()) {
      return setError('Content is required');
    }
    if (content.length > maxAllowedLength) {
      return setError(`Content cannot exceed ${maxAllowedLength} characters.`);
    }
    if (hasExceededLimit) {
      return setError('You can add up to 5 hashtags per post.');
    }

    setSaving(true);
    try {
      const payload = {
        content: content.trim(),
        media,
        hashtags: validTags,
      };
      if (isProject) {
        payload.title = title.trim();
        payload.github_link = githubLink.trim();
        payload.preview_link = previewLink.trim();
      }

      const updatedPost = await updatePost(post.id, payload, currentUser.id);
      if (validTags.length > 0) {
        recordHashtagsUsage(validTags);
      }
      onUpdated(updatedPost);
      toast.success('Post updated successfully!');
      onClose();
      reset();
    } catch (err) {
      setError(err.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      reset();
    }
  };

  const getCharCountClass = (len) => {
    if (len > maxAllowedLength) return 'text-red-500 font-bold';
    if (len >= maxAllowedLength - 10) return 'text-red-500 font-bold';
    if (len >= maxAllowedLength - 40) return 'text-amber-500 dark:text-amber-400 font-semibold';
    if (len >= 501) return 'text-neutral-700 dark:text-neutral-300 font-medium';
    return 'text-neutral-400 dark:text-neutral-500';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-lg bg-white dark:bg-black border-[#DBDBDB] dark:border-[#262626] rounded-2xl p-6"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-[#0F172A] dark:text-white">
            Edit {isProject ? 'Project' : 'Discussion'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div data-testid="edit-post-error" className="bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 rounded-xl text-[#EF4444] text-[13px] font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isProject && (
            <div>
              <Label className="text-[#0F172A] dark:text-white text-[13px] md:text-[15px] font-medium">
                Project Title
              </Label>
              <Input
                data-testid="edit-post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your project name"
                className="mt-1.5 bg-[#FAFAFA] dark:bg-[#0A0A0A] border-[#DBDBDB] dark:border-[#262626] dark:text-white focus:border-[#0095F6] rounded-xl"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[#0F172A] dark:text-white text-[13px] md:text-[15px] font-medium">
                {isProject ? 'Description' : 'Content'}
              </Label>
              <span className={`text-xs tabular-nums ${getCharCountClass(content.length)}`}>
                {content.length} / {maxAllowedLength}
              </span>
            </div>
            <Textarea
              data-testid="edit-post-content"
              value={content}
              onChange={handleContentChange}
              placeholder={isProject ? 'Describe your project with #hashtags inline...' : 'Share your thoughts with #hashtags inline...'}
              rows={5}
              className="mt-1.5 bg-[#FAFAFA] dark:bg-[#0A0A0A] border-[#DBDBDB] dark:border-[#262626] dark:text-white focus:border-[#0095F6] rounded-2xl resize-none p-3.5 text-[14px] leading-relaxed"
            />
            {hasExceededLimit && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                You can add up to 5 hashtags per post.
              </p>
            )}
          </div>

          <div>
            <Label className="text-[#0F172A] dark:text-white text-[13px] md:text-[15px] font-medium flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#0095F6]" /> <span>Media</span>
            </Label>
            {post?.type !== 'pulse' && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/40 select-none">
                <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0" />
                <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 font-medium">
                  Uploaded media is public and visible to anyone viewing this post.
                </p>
              </div>
            )}
            <div className="mt-2">
              <MediaUpload
                type={post?.type === 'pulse' ? 'video' : 'image'}
                folder={post?.type === 'pulse' ? 'pulse' : 'posts'}
                multiple={post?.type !== 'pulse'}
                maxFiles={post?.type === 'pulse' ? 1 : 4}
                onUploadingChange={setIsUploadingMedia}
                onUploadComplete={(result) => {
                  const newMedia = Array.isArray(result) ? result : [result];
                  setMedia((prev) => {
                    const combined = [...prev, ...newMedia];
                    if (post?.type !== 'pulse' && combined.length > 4) {
                      toast.error('You can only attach up to 4 files per post.');
                      return combined.slice(0, 4);
                    }
                    return combined;
                  });
                  toast.success('Media uploaded successfully!');
                }}
              />
              {media.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {media.map((m, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden group border border-neutral-200 dark:border-neutral-700">
                      {m.format === 'mp4' || m.url?.includes('video') ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={m.thumbnail || m.url} alt="media" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isProject && (
            <div className="space-y-3">
              <div>
                <Label className="text-[#0F172A] dark:text-white text-[13px] md:text-[15px] font-medium">
                  GitHub Link
                </Label>
                <Input
                  data-testid="edit-post-github"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1 bg-[#FAFAFA] dark:bg-[#0A0A0A] border-[#DBDBDB] dark:border-[#262626] dark:text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[#0F172A] dark:text-white text-[13px] md:text-[15px] font-medium">
                  Live Preview Link
                </Label>
                <Input
                  data-testid="edit-post-preview"
                  value={previewLink}
                  onChange={(e) => setPreviewLink(e.target.value)}
                  placeholder="https://your-app.com"
                  className="mt-1 bg-[#FAFAFA] dark:bg-[#0A0A0A] border-[#DBDBDB] dark:border-[#262626] dark:text-white rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              data-testid="edit-post-submit"
              disabled={saving || isUploadingMedia || content.length > maxAllowedLength || hasExceededLimit}
              className="flex-1 bg-[#0095F6] text-white hover:bg-[#1877F2] py-2.5 font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              disabled={saving}
              variant="outline"
              className="border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
