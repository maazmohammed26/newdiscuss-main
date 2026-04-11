import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ExternalLink } from 'lucide-react';

/**
 * ChatLinkText - Renders text with clickable links
 * - https:// and www links open directly
 * - http:// links show a warning popup before opening
 * - Does not affect existing data/messages
 */
export default function ChatLinkText({ text, className = '' }) {
  const [showHttpWarning, setShowHttpWarning] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');

  // Regex to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

  const handleLinkClick = (url, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Normalize URL
    let normalizedUrl = url;
    if (url.startsWith('www.')) {
      normalizedUrl = 'https://' + url;
    }

    // Check if it's an http:// link (not https://)
    if (normalizedUrl.startsWith('http://')) {
      setPendingUrl(normalizedUrl);
      setShowHttpWarning(true);
    } else {
      // https:// and www links open directly
      window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmHttpLink = () => {
    window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    setShowHttpWarning(false);
    setPendingUrl('');
  };

  const renderTextWithLinks = () => {
    if (!text) return null;

    const parts = [];
    let lastIndex = 0;
    let match;

    const regex = new RegExp(urlRegex.source, 'gi');

    while ((match = regex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }

      const url = match[0];
      const isHttp = url.startsWith('http://') || (!url.startsWith('https://') && !url.startsWith('www.') && url.includes('http://'));
      const normalizedUrl = url.startsWith('www.') ? 'https://' + url : url;
      const isInsecure = normalizedUrl.startsWith('http://');

      // Add the link
      parts.push(
        <button
          key={`link-${match.index}`}
          onClick={(e) => handleLinkClick(url, e)}
          className={`inline-flex items-center gap-0.5 text-[#60A5FA] hover:text-[#93C5FD] underline underline-offset-2 decoration-1 hover:decoration-2 transition-all break-all ${
            isInsecure ? 'text-[#FBBF24] hover:text-[#FCD34D]' : ''
          }`}
        >
          {url}
          <ExternalLink className="w-3 h-3 inline-flex shrink-0 ml-0.5" />
          {isInsecure && <AlertTriangle className="w-3 h-3 inline-flex shrink-0 text-[#FBBF24]" />}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <>
      <span className={className}>{renderTextWithLinks()}</span>

      {/* HTTP Warning Dialog */}
      <AlertDialog open={showHttpWarning} onOpenChange={setShowHttpWarning}>
        <AlertDialogContent className="dark:bg-[#1E293B] dark:border-[#334155] discuss:bg-[#262626] discuss:border-[#333333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-[#F1F5F9] discuss:text-[#F5F5F5] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
              Insecure Link Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-[#94A3B8] discuss:text-[#9CA3AF]">
              <p className="mb-2">
                This link uses <strong className="text-[#F59E0B]">HTTP</strong> instead of HTTPS, which is not secure.
              </p>
              <p className="text-xs break-all bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#1a1a1a] p-2 rounded border border-[#E2E8F0] dark:border-[#334155] discuss:border-[#333333]">
                {pendingUrl}
              </p>
              <p className="mt-2 text-xs">
                Your connection to this site may not be private. Do you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155] discuss:bg-[#333333] discuss:text-[#F5F5F5] discuss:border-[#333333]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmHttpLink}
              className="bg-[#F59E0B] text-white hover:bg-[#D97706]"
            >
              Open Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
