import React, { useState } from 'react';
import { Mail, Check, CheckCheck, Clock, MapPin, Reply, AlertCircle } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import LetterRouteAnimation from './LetterRouteAnimation';
import { markLetterOpened } from '../data/letterRepository';

export default function LetterCard({
  letter,
  currentUserId,
  senderProfile = null,
  recipientProfile = null,
  onReply = null,
  defaultExpanded = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || Boolean(letter.openedAt));
  const isRecipient = letter.recipientId === currentUserId;
  const isSender = letter.senderId === currentUserId;

  const authorProfile = isSender ? senderProfile : (senderProfile || recipientProfile);

  // Status computation according to PRD Section 14:
  // Allowed: On its way, Sent, Opened, Couldn't send (Remove Delivered)
  const isPending = letter.status === 'QUEUED' || letter.status === 'PENDING' || String(letter.id || '').startsWith('opt_');
  const isFailed = letter.status === 'FAILED';
  const isOpened = Boolean(letter.openedAt);
  const isSent = !isPending && !isFailed && !isOpened;

  const handleOpenLetter = async () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
    if (isRecipient && !letter.openedAt && !isPending && !isFailed) {
      try {
        await markLetterOpened(letter.id, letter.threadId);
      } catch (e) {
        console.warn('[LetterCard] Mark opened error:', e);
      }
    }
  };

  // Middle-dot separated date & city formatting (PRD Section 13)
  // e.g. "Sep 21 · Bengaluru"
  const formattedDate = letter.createdAt
    ? new Date(letter.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const locationSubtitle = [
    formattedDate,
    letter.originCityLabel || null,
  ].filter(Boolean).join(' · ');

  // Canonical author username/name: never "Sent by you", never "undefined"
  const authorName = authorProfile?.username
    ? `@${authorProfile.username}`
    : (authorProfile?.displayName || authorProfile?.fullName || 'Discuss Member');

  return (
    <div
      className={`w-full max-w-lg mx-auto bg-[#fcfaf4] dark:bg-[#1c1a17] rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs transition-all duration-300 overflow-hidden relative select-none ${className}`}
    >
      {/* Subtle Paper Texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Header Bar */}
      <div
        onClick={handleOpenLetter}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenLetter();
          }
        }}
        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
          !isExpanded ? 'hover:bg-neutral-500/5' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <UserAvatar user={authorProfile} className="w-full h-full" interactive={false} fit="cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {authorName}
              </span>
              {authorProfile && <VerifiedBadge user={authorProfile} size="xs" />}
            </div>

            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="truncate">{locationSubtitle || formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Status Badge: Sent, Opened, On its way, Couldn't send (No Delivered) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-200/60 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-full text-xs font-medium hover:bg-neutral-300/60 dark:hover:bg-neutral-700 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span>Unfold</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              {isFailed ? (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Couldn't send
                </span>
              ) : isPending ? (
                <span className="flex items-center gap-1 text-neutral-400">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  On its way
                </span>
              ) : isOpened ? (
                <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 font-medium">
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                  Opened
                </span>
              ) : (
                <span className="flex items-center gap-1 text-neutral-400">
                  <Check className="w-3.5 h-3.5" />
                  Sent
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unfolded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 relative z-10">
          {/* Flight route if cities present */}
          {letter.originCityLabel && letter.destinationCityLabel && (
            <LetterRouteAnimation
              originCityLabel={letter.originCityLabel}
              originCityId={letter.originCityId}
              destinationCityLabel={letter.destinationCityLabel}
              destinationCityId={letter.destinationCityId}
              className="py-1 border-t border-b border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-500/[0.02] rounded-lg"
            />
          )}

          {/* Letter Body in Caveat handwritten script */}
          <div className="py-2 text-neutral-900 dark:text-neutral-100 font-['Caveat'] text-2xl sm:text-[26px] leading-relaxed whitespace-pre-wrap select-text">
            {letter.body}
          </div>

          {/* Footer - Text only, no decorative star */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-200/60 dark:border-neutral-800/70 text-xs text-neutral-400 dark:text-neutral-500">
            <span className="tracking-widest font-semibold text-[10px] uppercase text-neutral-400 dark:text-neutral-500">
              DISCUSS LETTER
            </span>

            {/* Reply action if recipient and not deleted */}
            {isRecipient && onReply && (
              <button
                type="button"
                onClick={() => onReply(letter.senderId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 active:scale-95 text-white dark:text-black font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
