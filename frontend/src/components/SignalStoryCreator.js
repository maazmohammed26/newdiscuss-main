import UserAvatar from '@/components/UserAvatar';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createStory } from '@/lib/storiesDb';
import { X, Zap, AlertCircle, Loader2, Image as ImageIcon, Type, Globe2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MediaUpload from '@/components/MediaUpload';


const MAX_CHARS = 350;

export default function SignalStoryCreator({ onClose, onCreated }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [mediaList, setMediaList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const textareaRef = useRef(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const remaining = MAX_CHARS - text.length;
  const isOverLimit = remaining < 0;
  const hasText = text.trim().length > 0;
  const hasMedia = mediaList.length > 0;
  const isEmpty = !hasText && !hasMedia;
  const isReady = !isEmpty && !isOverLimit && !isUploadingMedia;
  const canPost = isReady && !submitting;

  const handleSubmit = async () => {
    if (isUploadingMedia) {
      toast('Media is still uploading. Please wait a moment.');
      return;
    }
    if (!canPost || !user) return;
    setSubmitting(true);
    try {
      if (mediaList.length > 0) {
        for (const item of mediaList) {
          await createStory(
            user.id,
            user.username,
            user.photo_url || '',
            '',
            item.url || '',
            item.type || 'image'
          );
        }
      } else {
        await createStory(
          user.id,
          user.username,
          user.photo_url || '',
          text.trim(),
          '',
          'text'
        );
      }
      toast.success('Story posted!', { duration: 2000 });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Story creation error:', err);
      toast.error('Failed to post story. Please try again.');
      setSubmitting(false);
    }
  };

  const removeMedia = (index) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative mx-auto flex h-[calc(100vh-8px)] max-h-[calc(100vh-8px)] min-h-0 w-full flex-col overflow-hidden rounded-t-[24px] border border-[#DBDBDB] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] animate-in slide-in-from-bottom-4 duration-200 dark:border-[#262626] dark:bg-black sm:h-auto sm:max-h-[min(92vh,760px)] sm:max-w-lg sm:rounded-[24px] sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-[#EFEFEF] bg-white/95 px-5 pb-4 pt-5 backdrop-blur-xl dark:border-[#262626] dark:bg-black/95">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center ig-story-gradient shadow-sm">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-neutral-900 dark:text-white block leading-tight">New Signal</span>
              <span className="text-[10px] text-neutral-400">Share one focused update</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:bg-[#1A1A1A] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {/* Author row */}
        <div className="flex items-center gap-3 px-5 py-4">
          <UserAvatar
            src={user?.photo_url}
            username={user?.username}
            userId={user?.id}
            priority
            className="w-9 h-9 ring-2 ring-[#0095F6]/20"
          />
          <div>
            <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 dark:text-white">
              {user?.username}
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1"><Globe2 className="w-3 h-3" /> Everyone · 24 hours</span>
            </p>
          </div>
        </div>

        {/* Text input */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-700 dark:text-neutral-300"><Type className="w-3.5 h-3.5" /> Text Signal</span>
            {hasMedia && <span className="text-[10px] font-semibold text-neutral-400">Disabled while an image is attached</span>}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => !hasMedia && setText(e.target.value)}
            disabled={hasMedia}
            placeholder="What's your signal? Share a thought, link, or update…"
            rows={6}
            className="w-full resize-none rounded-2xl border border-[#DBDBDB] dark:border-[#262626] bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 text-[15px] leading-relaxed text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:border-[#0095F6] focus:ring-2 focus:ring-[#0095F6]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>

        {/* Custom Media Preview */}
        {mediaList.length > 0 && (
          <div className="px-5 pb-3">
            {mediaList.map((item, index) => (
              <div key={index} className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} alt="Story Media" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Media Upload */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-700 dark:text-neutral-300"><ImageIcon className="w-3.5 h-3.5" /> Image Signal</span>
            {hasText && <span className="text-[10px] font-semibold text-neutral-400">Clear text to attach an image</span>}
          </div>
          <MediaUpload 
            type="image" 
            folder="stories"
            multiple={false}
            maxFiles={1}
            disabled={hasText}
            disabledMessage="Clear text to add an image"
            onUploadingChange={setIsUploadingMedia}
            onUploadComplete={(result) => {
              setText('');
              setMediaList(Array.isArray(result) ? result.slice(0, 1) : [result]);
              toast.success('Media added to story');
            }} 
          />
        </div>

        </div>

        {/* Footer */}
        <div className="z-20 flex shrink-0 items-center justify-between border-t border-neutral-100 bg-white px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-10px_30px_rgba(15,23,42,.05)] dark:border-neutral-800 dark:bg-black">
          {/* Char counter */}
          <div className="flex items-center gap-1.5">
            {isOverLimit && (
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
              className={`text-[12px] font-medium tabular-nums transition-colors ${
                isOverLimit
                  ? 'text-red-500'
                  : remaining <= 50
                  ? 'text-amber-500'
                  : 'text-neutral-400 dark:text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {remaining}
            </span>
          </div>

          {/* Post button */}
          <button
            onClick={handleSubmit}
            disabled={!canPost}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
            style={{
              background: (isReady || submitting)
                ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                : '#d4d4d8',
              boxShadow: (isReady || submitting)
                ? '0 4px 14px rgba(168,85,247,0.4)'
                : 'none',
              opacity: submitting ? 0.82 : 1,
            }}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{submitting ? 'Posting…' : 'Post Signal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
