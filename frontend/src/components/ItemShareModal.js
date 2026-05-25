import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Mail, Check, Calendar, MapPin, Briefcase } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_8b258d09-2813-4c39-875f-1044b1a2ed97/artifacts/bnfmcn2l_rqVRL__1_-removebg-preview.png';

function truncateForDisplay(text, maxLen = 80) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}

function TwitterIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0 dark:fill-white" fill="#000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}

function TelegramIcon() {
  return <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
}

export default function ItemShareModal({ open, onClose, item, type }) {
  const [copied, setCopied] = useState(false);
  if (!item) return null;

  const isNews = type === 'news';
  const isHackathon = !isNews && item.jobType === 'Hackathon';
  const isInternship = !isNews && item.jobType === 'Internship';

  let categoryLabel = 'SHARE';
  let badgeColor = 'bg-[#2563EB]/10 text-[#2563EB]';
  if (isNews) {
    categoryLabel = 'TECH NEWS';
    badgeColor = 'bg-[#EF4444]/10 text-[#EF4444]';
  } else if (isHackathon) {
    categoryLabel = item.hackathonPlatform && item.hackathonPlatform !== 'Others' 
      ? `HACKATHON BY ${item.hackathonPlatform.toUpperCase()}` 
      : 'HACKATHON';
    badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  } else if (isInternship) {
    categoryLabel = 'INTERNSHIP';
    badgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
  } else {
    categoryLabel = 'JOB OPPORTUNITY';
    badgeColor = 'bg-green-500/10 text-green-600 dark:text-green-400';
  }

  const rawTitle = item.title || 'Tech Update';
  const itemTitle = truncateForDisplay(rawTitle, 80);
  const fullContent = item.description || '';

  const itemUrl = `${window.location.origin}/${isNews ? 'news' : 'jobs'}/${item.id}`;
  const encodedText = encodeURIComponent(`${rawTitle} - Read more on Discuss: ${itemUrl}`);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: rawTitle,
          text: `${rawTitle} - Read more on Discuss`,
          url: itemUrl,
        });
      } catch {}
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      href: `https://wa.me/?text=${encodedText}`,
      color: 'hover:bg-[#25D366]/10'
    },
    {
      name: 'X',
      icon: <TwitterIcon />,
      href: `https://twitter.com/intent/tweet?text=${encodedText}`,
      color: 'hover:bg-black/5 dark:hover:bg-white/10'
    },
    {
      name: 'Telegram',
      icon: <TelegramIcon />,
      href: `https://t.me/share/url?url=${encodeURIComponent(itemUrl)}&text=${encodeURIComponent(rawTitle)}`,
      color: 'hover:bg-[#0088cc]/10'
    },
    {
      name: 'Email',
      icon: <Mail className="w-6 h-6 text-[#6275AF] dark:text-[#94A3B8] shrink-0" />,
      href: `mailto:?subject=${encodeURIComponent(`${rawTitle} - Discuss`)}&body=${encodeURIComponent(`Check this out: ${itemUrl}`)}`,
      color: 'hover:bg-[#6275AF]/10'
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-32px)] max-w-[420px] bg-white dark:bg-[#1E293B] discuss:bg-[#121212] border-[#E2E8F0] dark:border-[#334155] discuss:border-[#222222] overflow-hidden p-5 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#2563EB] discuss:bg-[#EF4444] rounded-xl flex items-center justify-center shrink-0">
              <img src={LOGO_URL} alt="Discuss Logo" className="h-5 brightness-0 invert" />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}>
                {categoryLabel}
              </span>
              <DialogTitle className="font-heading text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-white mt-1 truncate">
                Share this {isNews ? 'News' : isHackathon ? 'Hackathon' : 'Job'}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Premium Preview Card */}
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] discuss:bg-[#1A1A1A] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#2A2A2A] mt-3 overflow-hidden">
          <div className="flex items-start gap-3 min-w-0">
            {isNews && item.image ? (
              <img 
                src={item.image} 
                alt="News preview" 
                className="w-14 h-14 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 discuss:border-neutral-800 shrink-0" 
              />
            ) : (
              <div className="w-12 h-12 bg-[#3B82F6]/10 text-[#3B82F6] rounded-xl flex items-center justify-center shrink-0">
                {isNews ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 012 2v5a2 2 0 01-2 2h-1M13 18h1" /></svg>
                ) : (
                  <Briefcase className="w-6 h-6" />
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0 overflow-hidden">
              <p
                className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#E5E5E5] text-[13px] font-bold leading-snug"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-all',
                  overflowWrap: 'anywhere',
                }}
              >
                {itemTitle}
              </p>

              {!isNews && item.companyName && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                  {item.companyName}
                </p>
              )}

              {fullContent && (
                <p
                  className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#8E8E8E] text-[11px] mt-1"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {fullContent}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] discuss:border-[#2A2A2A] flex items-center justify-between">
            <div className="flex items-center gap-1">
              <img src={LOGO_URL} alt="" className="h-3.5" />
              <span className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#8E8E8E] text-[10px] font-semibold">Discuss Tech</span>
            </div>
            <span className="text-[10px] text-[#2563EB] discuss:text-[#EF4444] font-medium">discuss.team</span>
          </div>
        </div>

        {/* Share buttons row */}
        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {shareOptions.map((opt) => (
            <a
              key={opt.name}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#222222] ${opt.color} transition-all bg-neutral-50/50 dark:bg-neutral-900/30`}
            >
              {opt.icon}
              <span className="text-[9px] leading-tight text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#8E8E8E] font-medium text-center w-full truncate px-0.5">
                {opt.name}
              </span>
            </a>
          ))}
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#222222] hover:bg-[#2563EB]/10 discuss:hover:bg-[#EF4444]/10 transition-all bg-neutral-50/50 dark:bg-neutral-900/30"
          >
            {copied
              ? <Check className="w-6 h-6 text-[#10B981] shrink-0" />
              : <Copy className="w-6 h-6 text-[#2563EB] discuss:text-[#EF4444] shrink-0" />}
            <span className="text-[9px] leading-tight text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#8E8E8E] font-medium text-center">
              {copied ? '✓' : 'Copy'}
            </span>
          </button>
        </div>

        {/* Native share on mobile */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full mt-2 bg-[#F1F5F9] dark:bg-[#334155] discuss:bg-[#1A1A1A] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] discuss:hover:bg-[#262626] text-[#0F172A] dark:text-[#F1F5F9] discuss:text-white rounded-xl py-2.5 text-[12px] font-semibold transition-colors"
          >
            More sharing options…
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
