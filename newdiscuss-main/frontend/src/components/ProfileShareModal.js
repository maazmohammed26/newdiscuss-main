import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Copy, Check, Share2, MessageCircle, Send, Instagram, 
  Twitter, Facebook, Linkedin, Mail, Link2
} from 'lucide-react';

/**
 * ProfileShareModal - Share profile with various options
 * - Copy username only
 * - Copy full message
 * - Share to social platforms
 */
export default function ProfileShareModal({ open, onClose, username }) {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareMessage = `I'm using Discuss. My username is ${username}. Search for me and send a request to connect.`;
  const profileUrl = `https://dsscus.netlify.app/user/${username}`;

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopiedUsername(true);
      toast.success('Username copied!');
      setTimeout(() => setCopiedUsername(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopiedMessage(true);
      toast.success('Message copied!');
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async (platform) => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(profileUrl);

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=Connect with me on Discuss&body=${encodedMessage}`,
    };

    if (platform === 'instagram') {
      // Instagram doesn't support direct sharing, copy message instead
      handleCopyMessage();
      toast.info('Message copied! You can paste it on Instagram.');
      return;
    }

    // Try native share on mobile
    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: 'Connect with me on Discuss',
          text: shareMessage,
          url: profileUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
        return;
      }
    }

    const url = shareUrls[platform];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

  const shareOptions = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: '#0088cc' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
    { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
    { id: 'email', name: 'Email', icon: Mail, color: '#EA4335' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
        <DialogHeader>
          <DialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5] flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#2563EB] discuss:text-[#EF4444]" />
            Share Your Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Username Copy */}
          <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs mb-2">Your username</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]">@{username}</span>
              <Button
                onClick={handleCopyUsername}
                size="sm"
                variant="outline"
                className="h-8 px-3 dark:border-[#334155] discuss:border-[#333333] dark:text-[#F1F5F9] discuss:text-[#F5F5F5]"
              >
                {copiedUsername ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1.5 text-xs">{copiedUsername ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Full Message Copy */}
          <div className="bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
            <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs mb-2">Share message</p>
            <p className="text-[#0F172A] dark:text-[#F1F5F9] discuss:text-[#F5F5F5] text-sm mb-3">
              "{shareMessage}"
            </p>
            <Button
              onClick={handleCopyMessage}
              size="sm"
              className="w-full bg-[#2563EB] discuss:bg-[#EF4444] hover:bg-[#1D4ED8] discuss:hover:bg-[#DC2626] text-white"
            >
              {copiedMessage ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              <span className="ml-1.5">{copiedMessage ? 'Copied!' : 'Copy Message'}</span>
            </Button>
          </div>

          {/* Native Share (Mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              onClick={() => handleShare('native')}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] discuss:from-[#EF4444] discuss:to-[#F59E0B] text-white h-11"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          )}

          {/* Share Options Grid */}
          <div>
            <p className="text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] text-xs mb-3">Or share via</p>
            <div className="grid grid-cols-4 gap-2">
              {shareOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleShare(option.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white dark:bg-[#1E293B] discuss:bg-[#1a1a1a] hover:bg-[#F5F5F7] dark:hover:bg-[#334155] discuss:hover:bg-[#262626] border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333] transition-all hover:scale-105"
                  >
                    <IconComponent className="w-5 h-5" style={{ color: option.color }} />
                    <span className="text-[10px] text-[#6275AF] dark:text-[#94A3B8] discuss:text-[#9CA3AF] truncate w-full text-center">
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
