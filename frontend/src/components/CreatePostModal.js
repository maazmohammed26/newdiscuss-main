import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, FolderGit2, Loader2, Hash, X, PlayCircle, Camera, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { IoVideocam } from 'react-icons/io5';
import { toast } from 'sonner';
import MediaUpload from '@/components/MediaUpload';
import { createPulse } from '@/lib/pulseDb';

export default function CreatePostModal({ open, onClose, onCreated, initialType = 'discussion' }) {
  const { user } = useAuth();
  const [postType, setPostType] = useState(initialType);

  useEffect(() => {
    if (open) {
      setPostType(initialType);
    }
  }, [open, initialType]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [previewLink, setPreviewLink] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const reset = () => { 
    setPostType('discussion'); 
    setTitle(''); 
    setContent(''); 
    setGithubLink(''); 
    setPreviewLink(''); 
    setHashtagInput(''); 
    setHashtags([]); 
    setMedia([]);
    setError(''); 
    setShowCode(false);
    setCode('');
    setCodeLanguage('javascript');
  };

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
    if (postType === 'pulse' && media.length === 0) return setError('A video is required for Pulse');
    if (postType !== 'pulse' && !content.trim() && media.length === 0) return setError('Content or media is required');
    
    setLoading(true);
    try {
      if (postType === 'pulse') {
        const pulseId = await createPulse(
          user.id || user.uid,
          user.username || user.displayName || user.email?.split('@')[0],
          user.photo_url || user.photoURL || '',
          media[0], // Pulse assumes single video result from MediaUpload
          content.trim()
        );
        onCreated({ id: pulseId, type: 'pulse' }); // Basic notification
      } else {
        const newPost = await createPost({
          type: postType, 
          title: postType === 'project' ? title.trim() : '',
          content: content.trim(), 
          media: media, // Array of {url, thumbnail, type}
          github_link: postType === 'project' ? githubLink.trim() : '',
          preview_link: postType === 'project' ? previewLink.trim() : '', 
          hashtags,
          code: (postType === 'discussion' && showCode) ? code.trim() : '',
          codeLanguage: (postType === 'discussion' && showCode) ? codeLanguage : '',
        }, user);
        onCreated(newPost);
      }
      reset();
      toast.success('Post created!');
    } catch (err) { 
      setError(err.message || 'Failed to create post'); 
    } finally { 
      setLoading(false); 
    }
  };

  const placeholderText = postType === 'project' 
    ? 'Describe your project... (use #hashtags inline)' 
    : postType === 'pulse' 
      ? 'Add a caption for your Pulse video...' 
      : 'Share your thoughts, ideas, questions... (use #hashtags inline)';

  const labelText = postType === 'project' ? 'Description' : postType === 'pulse' ? 'Caption' : "What's on your mind?";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-lg bg-white dark:bg-[#1E293B] dark:border-[#334155] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
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
            <button type="button" onClick={() => setPostType('project')}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${postType === 'project' ? 'border-[#3B82F6] bg-[#3B82F6]/5' : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#3B82F6]/30'}`}>
              <FolderGit2 className={`w-5 h-5 ${postType === 'project' ? 'text-[#3B82F6]' : 'text-[#64748B] dark:text-[#94A3B8]'}`} />
              <span className={`text-[13px] md:text-[15px] font-medium ${postType === 'project' ? 'text-[#3B82F6]' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>Project</span>
            </button>
            <button type="button" onClick={() => setPostType('pulse')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all col-span-2 ${postType === 'pulse' ? 'border-[#EF4444] bg-[#EF4444]/5' : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#EF4444]/30'}`}>
              <PlayCircle className={`w-5 h-5 ${postType === 'pulse' ? 'text-[#EF4444]' : 'text-[#EF4444] opacity-60'}`} />
              <span className={`text-[13px] md:text-[15px] font-medium ${postType === 'pulse' ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`}>Pulse (Video)</span>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium">
                {labelText}
              </Label>
              {postType === 'pulse' && (
                <span className={`text-xs ${content.length > 150 ? 'text-red-500' : 'text-neutral-500'}`}>
                  {content.length}/150
                </span>
              )}
            </div>
            <Textarea data-testid="create-post-content" value={content} onChange={(e) => {
                if (postType === 'pulse' && e.target.value.length > 150) return;
                setContent(e.target.value);
              }}
              placeholder={placeholderText}
              rows={postType === 'discussion' ? 5 : 3} className="mt-1.5 bg-[#F1F5F9] dark:bg-[#0F172A] border-transparent dark:border-[#334155] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] focus:bg-white dark:focus:bg-[#1E293B] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 rounded-md resize-none" />
          </div>

          {/* Interactive Code Entry Option (only for Discussion posts) */}
          {postType === 'discussion' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline flex items-center gap-1.5 select-none"
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
          <div className="space-y-2">
            <Label className="text-[#0F172A] dark:text-[#F1F5F9] text-[13px] md:text-[15px] font-medium flex items-center gap-2">
              {postType === 'pulse' ? (
                <>
                  <IoVideocam className="w-4 h-4 text-[#EF4444]" /> <span>Video Upload</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-[#2563EB]" /> <span>Media</span>
                </>
              )}
            </Label>
            {postType !== 'pulse' && (
              <div className="mt-1 flex items-start gap-2 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-2.5 rounded-lg select-none">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300 font-medium">
                  Visibility Notice: Uploaded images will be public and visible to anyone viewing this post. Please ensure you have the appropriate rights to share this media.
                </p>
              </div>
            )}
            <MediaUpload 
              type={postType === 'pulse' ? 'video' : 'image'} 
              folder={postType === 'pulse' ? 'pulse' : 'posts'}
              multiple={postType !== 'pulse'}
              maxFiles={postType === 'pulse' ? 1 : 4}
              onUploadComplete={(result) => {
                const newMedia = Array.isArray(result) ? result : [result];
                setMedia(prev => {
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
              <div className={`mt-3 flex flex-wrap gap-2 p-2 bg-[#F1F5F9] dark:bg-[#0F172A] discuss:bg-[#262626] rounded-lg ${postType === 'pulse' ? 'justify-center' : ''}`}>
                {media.map((m, idx) => (
                  <div key={idx} className={`relative rounded-md overflow-hidden group border border-neutral-200 dark:border-neutral-700 ${postType === 'pulse' ? 'w-full max-w-[200px] aspect-[9/16]' : 'w-16 h-16'}`}>
                    {m.type === 'video' || m.format === 'mp4' || m.url?.includes('video') ? (
                      <video src={m.url} className="w-full h-full object-cover bg-black" controls={postType === 'pulse'} playsInline />
                    ) : (
                      <img src={m.thumbnail || m.url} alt="media" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMedia(prev => prev.filter((_, i) => i !== idx))}
                      className={`absolute ${postType === 'pulse' ? 'top-2 right-2 p-1' : 'top-1 right-1 p-0.5'} bg-black/50 hover:bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10`}
                    >
                      <X size={postType === 'pulse' ? 16 : 12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
