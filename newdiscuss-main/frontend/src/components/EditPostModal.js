import { useState, useEffect } from 'react';
import { updatePost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditPostModal({ open, onClose, post, currentUser, onUpdated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isProject = post?.type === 'project';

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setGithubLink(post.github_link || '');
      setPreviewLink(post.preview_link || '');
      setError('');
    }
  }, [post]);

  const reset = () => {
    setTitle('');
    setContent('');
    setGithubLink('');
    setPreviewLink('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isProject && !title.trim()) {
      return setError('Project title is required');
    }
    if (!content.trim()) {
      return setError('Content is required');
    }

    setSaving(true);
    try {
      const payload = { content: content.trim() };
      if (isProject) {
        payload.title = title.trim();
        payload.github_link = githubLink.trim();
        payload.preview_link = previewLink.trim();
      }
      
      const updatedPost = await updatePost(post.id, payload, currentUser.id);
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#1a1a1a] discuss:border-[#333333]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">
            Edit {isProject ? 'Project' : 'Discussion'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div data-testid="edit-post-error" className="bg-[#EF4444]/8 border border-[#EF4444]/20 p-3 text-[#EF4444] text-[13px] discuss:bg-[#EF4444]/10 discuss:border-[#EF4444]/30">
              {error}
            </div>
          )}

          {isProject && (
            <div>
              <Label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px] md:text-[15px] font-medium">
                Project Title
              </Label>
              <Input
                data-testid="edit-post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your project name"
                className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] discuss:bg-[#262626] discuss:border-[#333333] discuss:text-[#F5F5F5] discuss:placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#3B82F6]/20 discuss:focus:ring-[#EF4444]/20"
              />
            </div>
          )}

          <div>
            <Label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px] md:text-[15px] font-medium">
              {isProject ? 'Description' : 'Content'}
            </Label>
            <Textarea
              data-testid="edit-post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isProject ? 'Describe your project...' : 'Share your thoughts...'}
              rows={5}
              className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] discuss:bg-[#262626] discuss:border-[#333333] discuss:text-[#F5F5F5] discuss:placeholder:text-[#6B7280] resize-none focus:ring-2 focus:ring-[#3B82F6]/20 discuss:focus:ring-[#EF4444]/20"
            />
          </div>

          {isProject && (
            <>
              <div>
                <Label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px] md:text-[15px] font-medium">
                  GitHub Link
                </Label>
                <Input
                  data-testid="edit-post-github"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] discuss:bg-[#262626] discuss:border-[#333333] discuss:text-[#F5F5F5] discuss:placeholder:text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-[13px] md:text-[15px] font-medium">
                  Live Preview Link
                </Label>
                <Input
                  data-testid="edit-post-preview"
                  value={previewLink}
                  onChange={(e) => setPreviewLink(e.target.value)}
                  placeholder="https://your-app.com"
                  className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] discuss:bg-[#262626] discuss:border-[#333333] discuss:text-[#F5F5F5] discuss:placeholder:text-[#6B7280]"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              data-testid="edit-post-submit"
              disabled={saving}
              className="flex-1 bg-[#2563EB] text-white hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:text-white discuss:hover:bg-[#DC2626] py-2.5 font-medium shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              disabled={saving}
              variant="outline"
              className="border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F5F5F7] dark:hover:bg-[#334155] discuss:border-[#333333] discuss:text-[#9CA3AF] discuss:hover:bg-[#262626]"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
