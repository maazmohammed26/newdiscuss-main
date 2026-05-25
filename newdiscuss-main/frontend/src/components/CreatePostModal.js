import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, FolderGit2, Loader2, Hash, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePostModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState('discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setPostType('discussion'); setTitle(''); setContent(''); setGithubLink(''); setPreviewLink(''); setHashtagInput(''); setHashtags([]); setError(''); };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '').toLowerCase();
    if (!tag) { setHashtagInput(''); return; }
    if (hashtags.length >= 5) { setHashtagInput(''); return; }
    if (!hashtags.includes(tag)) setHashtags([...hashtags, tag]);
    setHashtagInput('');
  };

  const handleHashtagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addHashtag(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (postType === 'project' && !title.trim()) return setError('Project title is required');
    if (!content.trim()) return setError('Content is required');
    setLoading(true);
    try {
      const newPost = await createPost({
        type: postType, 
        title: postType === 'project' ? title.trim() : '',
        content: content.trim(), 
        github_link: postType === 'project' ? githubLink.trim() : '',
        preview_link: postType === 'project' ? previewLink.trim() : '', 
        hashtags,
      }, user);
      onCreated(newPost); 
      reset();
      toast.success('Post created!');
    } catch (err) { 
      setError(err.message || 'Failed to create post'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1E293B] dark:border-[#334155]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9]">Create a post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && <div data-testid="create-post-error" className="bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-md p-3 text-[#EF4444] text-[13px]">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" data-testid="create-post-type-discussion" onClick={() => setPostType('discussion')}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === 'discussion' ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#2563EB]/30'}`}>
              <MessageSquare className={`w-5 h-5 ${postType === 'discussion' ? 'text-[#2563EB]' : 'text-[#6275AF] dark:text-[#94A3B8]'}`} />
              <span className={`text-[13px] md:text-[15px] font-medium ${postType === 'discussion' ? 'text-[#2563EB]' : 'text-[#6275AF] dark:text-[#94A3B8]'}`}>Discussion</span>
            </button>
            <button type="button" data-testid="create-post-type-project" onClick={() => setPostType('project')}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === 'project' ? 'border-[#3B82F6] bg-[#3B82F6]/5' : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#3B82F6]/30'}`}>
              <FolderGit2 className={`w-5 h-5 ${postType === 'project' ? 'text-[#3B82F6]' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
              <span className={`text-[13px] md:text-[15px] font-medium ${postType === 'project' ? 'text-[#3B82F6]' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>Project</span>
            </button>
          </div>

          {/* Title only for project posts */}
          {postType === 'project' && (
            <div>
              <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">Project Title</Label>
              <Input data-testid="create-post-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Your project name" className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md" />
            </div>
          )}

          <div>
            <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">
              {postType === 'project' ? 'Description' : "What's on your mind?"}
            </Label>
            <Textarea data-testid="create-post-content" value={content} onChange={(e) => setContent(e.target.value)}
              placeholder={postType === 'project' ? 'Describe your project... (use #hashtags inline)' : 'Share your thoughts, ideas, questions... (use #hashtags inline)'}
              rows={postType === 'discussion' ? 5 : 4} className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md resize-none" />
          </div>

          {/* Hashtags */}
          <div>
            <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">Hashtags</Label>
            <div className="mt-1.5">
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {hashtags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      <Hash className="w-3 h-3" />{tag}
                      <button type="button" onClick={() => setHashtags(hashtags.filter(t => t !== tag))} className="ml-0.5 hover:text-[#EF4444]"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input data-testid="create-post-hashtag-input" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown} placeholder={hashtags.length >= 5 ? "Max 5 hashtags" : "Type a tag and press Enter"}
                  disabled={hashtags.length >= 5}
                  className="flex-1 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md text-[13px]" />
                <Button type="button" onClick={addHashtag} variant="outline" className="border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:text-[#3B82F6] rounded-md px-3"><Hash className="w-4 h-4" /></Button>
              </div>
              <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] mt-1">
                {hashtags.length >= 5 
                  ? <span className="text-[#EF4444] font-medium">Maximum 5 hashtags reached</span>
                  : `Press Enter, Space, or comma to add. Max 5 hashtags. (${hashtags.length}/5)`
                }
              </p>
            </div>
          </div>

          {postType === 'project' && (
            <>
              <div>
                <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">GitHub Link</Label>
                <Input data-testid="create-post-github" value={githubLink} onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/..." className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md" />
              </div>
              <div>
                <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">Live Preview Link</Label>
                <Input data-testid="create-post-preview" value={previewLink} onChange={(e) => setPreviewLink(e.target.value)}
                  placeholder="https://your-app.com" className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md" />
              </div>
            </>
          )}

          <Button type="submit" data-testid="create-post-submit" disabled={loading}
            className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-md py-2.5 font-medium shadow-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Post'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
