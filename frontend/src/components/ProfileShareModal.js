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
  Copy, Check, Share2, MessageCircle, Send, Mail, Link2
} from 'lucide-react';
import { getProfileShareUrl } from '@/platform/deepLinks';

/**
 * ProfileShareModal - Unified, monochrome, premium share modal
 * Used for both own profile and other-user profile.
 * Ensures zero undefined text, uniform monochrome icons, and clean loading skeleton.
 */
export default function ProfileShareModal({ open, onClose, user = null, username = '', isOwnProfile = false }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Resolve target user attributes safely
  const resolvedUserId = user?.id || user?.userId || user?.uid || (typeof user === 'string' ? user : null);
  const resolvedUsername = (username || user?.username || '').trim();
  const resolvedDisplayName = (user?.fullName || user?.full_name || user?.displayName || resolvedUsername || '').trim();

  // Target resolution state
  const isTargetResolved = Boolean(resolvedUserId || resolvedUsername);

  // Canonical share URL using router helper (never /user/username)
  const profileUrl = resolvedUserId ? getProfileShareUrl(resolvedUserId) : '';

  // Contextual share copy
  const shareMessage = isOwnProfile
    ? (resolvedUsername 
        ? `Connect with me on Discuss! @${resolvedUsername} — ${profileUrl}`
        : `Connect with me on Discuss! ${profileUrl}`)
    : (resolvedDisplayName && resolvedUsername && resolvedDisplayName !== resolvedUsername
        ? `Check out ${resolvedDisplayName} (@${resolvedUsername}) on Discuss: ${profileUrl}`
        : resolvedUsername
        ? `Check out @${resolvedUsername} on Discuss: ${profileUrl}`
        : `Check out this developer on Discuss: ${profileUrl}`);

  const handleCopyLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyUsername = async () => {
    if (!resolvedUsername) return;
    try {
      await navigator.clipboard.writeText(resolvedUsername);
      setCopiedUsername(true);
      toast.success('Username copied!');
      setTimeout(() => setCopiedUsername(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleCopyMessage = async () => {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopiedMessage(true);
      toast.success('Share message copied!');
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async (platform) => {
    if (!isTargetResolved) return;
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(profileUrl);

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
      email: `mailto:?subject=${encodeURIComponent(isOwnProfile ? 'Connect with me on Discuss' : `Discuss: ${resolvedDisplayName}`)}&body=${encodedMessage}`,
    };

    // Native share on mobile
    if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: isOwnProfile ? 'Connect with me on Discuss' : `Discuss: ${resolvedDisplayName}`,
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
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle },
    { id: 'telegram', name: 'Telegram', icon: Send },
    { id: 'twitter', name: 'X', icon: Share2 },
    { id: 'email', name: 'Email', icon: Mail },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md bg-white dark:bg-[#121212] border-neutral-200 dark:border-[#262626] rounded-2xl p-5 shadow-2xl"
        data-testid="profile-share-modal"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-neutral-900 dark:text-white stroke-[2.2px]" />
            <span>{isOwnProfile ? 'Share Your Profile' : 'Share Profile'}</span>
          </DialogTitle>
        </DialogHeader>

        {!isTargetResolved ? (
          /* Loading Skeleton if user data has not yet resolved */
          <div className="space-y-3 mt-2 animate-pulse" data-testid="share-skeleton">
            <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 space-y-2">
              <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 space-y-2">
              <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 mt-2">
            {/* Direct Profile Link Copy */}
            {profileUrl && (
              <div className="bg-neutral-50 dark:bg-black rounded-xl p-3 border border-neutral-200 dark:border-[#262626]">
                <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  Profile Link
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-700 dark:text-neutral-300 font-mono truncate select-all">
                    {profileUrl}
                  </span>
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 rounded-lg border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white shrink-0 font-medium text-xs cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white mr-1.5" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Username Copy (if available) */}
            {resolvedUsername && (
              <div className="bg-neutral-50 dark:bg-black rounded-xl p-3 border border-neutral-200 dark:border-[#262626]">
                <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                  Username
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    @{resolvedUsername}
                  </span>
                  <Button
                    onClick={handleCopyUsername}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 rounded-lg border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white shrink-0 font-medium text-xs cursor-pointer"
                  >
                    {copiedUsername ? <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    <span>{copiedUsername ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Share Message */}
            <div className="bg-neutral-50 dark:bg-black rounded-xl p-3 border border-neutral-200 dark:border-[#262626]">
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                Share message
              </p>
              <p className="text-neutral-800 dark:text-neutral-200 text-xs leading-relaxed mb-2.5 break-words">
                "{shareMessage}"
              </p>
              <Button
                onClick={handleCopyMessage}
                size="sm"
                className="w-full h-8.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                <span>{copiedMessage ? 'Message Copied!' : 'Copy Share Message'}</span>
              </Button>
            </div>

            {/* Native Share button on supported devices */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                onClick={() => handleShare('native')}
                variant="outline"
                className="w-full h-10 rounded-xl border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 mr-2" />
                <span>Share via device options…</span>
              </Button>
            )}

            {/* Neutral Monochrome Share Options */}
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
                Quick Share
              </p>
              <div className="grid grid-cols-4 gap-2">
                {shareOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleShare(option.id)}
                      className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-black hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-[#262626] transition-colors cursor-pointer group"
                    >
                      <IconComponent className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                      <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white truncate w-full text-center">
                        {option.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
