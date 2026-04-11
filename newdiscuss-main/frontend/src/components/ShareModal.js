import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Mail, Check } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_8b258d09-2813-4c39-875f-1044b1a2ed97/artifacts/bnfmcn2l_rqVRL__1_-removebg-preview.png';

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}
function TwitterIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6 dark:fill-white" fill="#000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}
function TelegramIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
}

export default function ShareModal({ open, onClose, post }) {
  const [copied, setCopied] = useState(false);
  if (!post) return null;

  const postTitle = post.title || post.content?.slice(0, 50) || 'Post';
  const fullContent = post.content || '';

  let shareText = `"${postTitle}" by @${post.author_username}\n\n${fullContent}`;
  if (post.github_link) shareText += `\n\nGitHub: ${post.github_link}`;
  if (post.preview_link) shareText += `\nLive Preview: ${post.preview_link}`;
  shareText += '\n\nJoin Discuss';
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: postTitle, text: shareText }); } catch {}
    }
  };

  const shareOptions = [
    { name: 'WhatsApp', icon: <WhatsAppIcon />, href: `https://wa.me/?text=${encodedText}`, color: 'hover:bg-[#25D366]/10' },
    { name: 'X / Twitter', icon: <TwitterIcon />, href: `https://twitter.com/intent/tweet?text=${encodedText}`, color: 'hover:bg-black/5 dark:hover:bg-white/10' },
    { name: 'Telegram', icon: <TelegramIcon />, href: `https://t.me/share/url?text=${encodedText}`, color: 'hover:bg-[#0088cc]/10' },
    { name: 'Email', icon: <Mail className="w-6 h-6 text-[#6275AF] dark:text-[#94A3B8]" />, href: `mailto:?subject=${encodeURIComponent(`${postTitle} - Discuss`)}&body=${encodedText}`, color: 'hover:bg-[#6275AF]/10' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E293B] dark:border-[#334155]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <img src={LOGO_URL} alt="Discuss" className="h-5 brightness-0 invert" />
            </div>
            <DialogTitle className="font-heading text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">Share this post</DialogTitle>
          </div>
        </DialogHeader>

        {/* Preview Card */}
        <div className="bg-[#F5F5F7] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] mt-2">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-[#2563EB] rounded-xl flex items-center justify-center shrink-0">
              <img src={LOGO_URL} alt="Discuss" className="h-6 brightness-0 invert" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#0F172A] dark:text-[#F1F5F9] text-[14px] font-semibold leading-snug line-clamp-2">{postTitle}</p>
              <p className="text-[#6275AF] dark:text-[#94A3B8] text-[12px] mt-1 line-clamp-3 whitespace-pre-wrap">{fullContent}</p>
              {(post.github_link || post.preview_link) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {post.github_link && <span className="text-[10px] text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded">GitHub</span>}
                  {post.preview_link && <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">Live Preview</span>}
                </div>
              )}
              <p className="text-[#2563EB] text-[11px] mt-1.5 font-medium">by @{post.author_username}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center gap-2">
            <img src={LOGO_URL} alt="" className="h-4" />
            <span className="text-[#6275AF] dark:text-[#94A3B8] text-[11px] font-medium">Join Discuss</span>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-5 gap-2 mt-3">
          {shareOptions.map((opt) => (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`share-${opt.name.toLowerCase().replace(/[^a-z]/g, '')}`}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] ${opt.color} transition-all`}
            >
              {opt.icon}
              <span className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] font-medium">{opt.name}</span>
            </a>
          ))}
          <button
            data-testid="share-copy-link"
            onClick={handleCopy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] hover:bg-[#2563EB]/10 transition-all"
          >
            {copied ? <Check className="w-6 h-6 text-[#10B981]" /> : <Copy className="w-6 h-6 text-[#2563EB]" />}
            <span className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            data-testid="share-native"
            onClick={handleNativeShare}
            className="w-full mt-2 bg-[#F5F5F7] dark:bg-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] text-[#0F172A] dark:text-[#F1F5F9] rounded-lg py-2.5 text-[13px] font-medium transition-colors"
          >
            More sharing options...
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
