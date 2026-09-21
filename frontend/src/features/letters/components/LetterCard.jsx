import React, { useState, useEffect } from 'react';
import { Mail, CheckCheck, Clock, MapPin, Reply, Sparkles } from 'lucide-react';
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

  // Automatically trigger markLetterOpened when recipient unfolds an unopened letter
  const handleOpenLetter = async () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
    if (isRecipient && !letter.openedAt) {
      try {
        await markLetterOpened(letter.id, letter.threadId);
      } catch (e) {
        console.warn('[LetterCard] Mark opened error:', e);
      }
    }
  };

  const formattedDate = letter.createdAt
    ? new Date(letter.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className={`w-full max-w-lg mx-auto bg-[#fcfaf2] dark:bg-[#1a1815] rounded-2xl border border-amber-900/15 dark:border-amber-500/15 shadow-sm transition-all duration-300 overflow-hidden relative ${className}`}
    >
      {/* Paper texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Folded Header / Envelope Flap */}
      <div
        onClick={handleOpenLetter}
        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
          !isExpanded ? 'hover:bg-amber-500/5' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar user={authorProfile} size="md" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {authorProfile?.displayName || authorProfile?.username || (isSender ? 'You' : 'Deleted user')}
              </span>
              {authorProfile?.username && <VerifiedBadge user={authorProfile} size="xs" />}
              {isSender && (
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  Sent by you
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formattedDate}</span>
              {letter.originCityLabel && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                    <MapPin className="w-3 h-3" />
                    {letter.originCityLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status / Receipt Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {!isExpanded ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium animate-pulse">
              <Mail className="w-3.5 h-3.5" />
              <span>Unfold</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              {letter.openedAt ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Opened
                </span>
              ) : (
                <span className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  Delivered
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unfolded Content (Gentle unfold transition) */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
          {/* Flight route if cities present */}
          {letter.originCityLabel && letter.destinationCityLabel && (
            <LetterRouteAnimation
              originCityLabel={letter.originCityLabel}
              originCityId={letter.originCityId}
              destinationCityLabel={letter.destinationCityLabel}
              destinationCityId={letter.destinationCityId}
              className="py-1 border-t border-b border-amber-900/10 dark:border-amber-500/10 bg-amber-500/[0.02] rounded-lg"
            />
          )}

          {/* Letter Body in Caveat handwritten script */}
          <div className="py-2 text-zinc-800 dark:text-zinc-100 font-['Caveat'] text-2xl sm:text-[25px] leading-relaxed whitespace-pre-wrap select-text">
            {letter.body}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-amber-900/10 dark:border-amber-500/10 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Discuss Letter</span>
            </div>

            {/* Reply action if recipient */}
            {isRecipient && onReply && (
              <button
                type="button"
                onClick={() => onReply(letter.senderId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-medium rounded-xl shadow-sm transition-all"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Write a Reply</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
