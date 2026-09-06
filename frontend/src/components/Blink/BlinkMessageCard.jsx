import React from 'react';
import { AlertCircle } from 'lucide-react';
import { isBlinkExpired, isBlinkViewed } from '../../lib/blinkService';
import './Blink.css';

/**
 * Discuss custom brand badge for Blink messages.
 * Uses Discuss two accent colors:
 * - Opening tag '<' in Discuss blue (#0095F6)
 * - Closing tag '/>' in Discuss red (#EF4444)
 * - Clean, bold, readable word 'Blink' in between
 * Designed cleanly without any camera emojis or decorative icons.
 */
export function BlinkBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-mono text-[12px] font-bold tracking-wider select-none bg-black/[0.04] dark:bg-white/[0.08] border border-neutral-200/80 dark:border-neutral-700/60 shadow-xs ${className}`}
    >
      <span className="text-[#0095F6] font-bold">&lt;</span>
      <span className="font-sans font-bold tracking-normal text-neutral-900 dark:text-neutral-100 px-0.5">
        Blink
      </span>
      <span className="text-[#EF4444] font-bold">/&gt;</span>
    </span>
  );
}

export default function BlinkMessageCard({
  message,
  currentUserId,
  isOwn,
  isGroup = false,
  onOpenBlink
}) {
  const expired = isBlinkExpired(message);
  const viewed = isBlinkViewed(message, currentUserId, isGroup);

  // Formatting message time
  const timeFormatted = message?.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── SENDER VIEW ───────────────────────────────────────────────
  if (isOwn) {
    const groupViewCount = isGroup && message?.viewedBy ? Object.keys(message.viewedBy).length : 0;
    const isSingleViewed = !isGroup && (message?.viewed || message?.claim?.claimedBy);
    const screenshotTaker =
      message?.screenshotBy ||
      (isGroup && message?.screenshots && Object.values(message.screenshots)[0]?.username);

    let senderStatusText = 'Waiting to be viewed';
    if (expired) {
      senderStatusText = 'Expired';
    } else if (isGroup) {
      if (groupViewCount > 0) {
        senderStatusText = `Opened · Viewed by ${groupViewCount} ${groupViewCount === 1 ? 'member' : 'members'}`;
      } else {
        senderStatusText = 'Waiting to be viewed';
      }
    } else if (isSingleViewed) {
      senderStatusText = 'Opened';
    }

    return (
      <div className="flex flex-col gap-1.5 max-w-[270px] select-none">
        {/* Screenshot alert if platform best-effort signal detected one */}
        {screenshotTaker && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>{screenshotTaker} may have captured your Blink.</span>
          </div>
        )}

        <div className="p-3 rounded-2xl rounded-br-sm bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-white shadow-xs min-w-[200px] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <BlinkBadge />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
              {timeFormatted}
            </span>
          </div>
          <div className="text-[12.5px] font-medium text-neutral-600 dark:text-neutral-300">
            {senderStatusText}
          </div>
        </div>
      </div>
    );
  }

  // ── RECIPIENT VIEW ────────────────────────────────────────────

  // 1. Expired state (after 24 hours without viewing)
  if (expired) {
    return (
      <div className="p-3 rounded-2xl rounded-bl-sm bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800/80 text-neutral-400 dark:text-neutral-500 min-w-[200px] max-w-[270px] flex flex-col gap-1.5 select-none opacity-80">
        <div className="flex items-center justify-between gap-3">
          <BlinkBadge />
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
            {timeFormatted}
          </span>
        </div>
        <div className="text-[12.5px] font-medium text-neutral-400 dark:text-neutral-500">
          Blink expired
        </div>
      </div>
    );
  }

  // 2. Opened / Already viewed state (after closing)
  if (viewed) {
    return (
      <div className="p-3 rounded-2xl rounded-bl-sm bg-neutral-100/90 dark:bg-neutral-900/80 border border-neutral-200/90 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 min-w-[200px] max-w-[270px] flex flex-col gap-1.5 select-none opacity-90">
        <div className="flex items-center justify-between gap-3">
          <BlinkBadge />
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
            {timeFormatted}
          </span>
        </div>
        <div className="text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
          Opened · Cannot be viewed again
        </div>
      </div>
    );
  }

  // 3. Unopened & ready to view state
  return (
    <button
      type="button"
      onClick={() => onOpenBlink && onOpenBlink(message)}
      className="text-left p-3 rounded-2xl rounded-bl-sm bg-white dark:bg-neutral-900 border border-[#0095F6]/40 dark:border-[#0095F6]/40 hover:border-[#0095F6] dark:hover:border-[#0095F6] text-neutral-900 dark:text-white shadow-xs hover:shadow-md transition-all min-w-[200px] max-w-[270px] w-full cursor-pointer group active:scale-[0.99] flex flex-col gap-1.5 blink-bubble-pulse focus:outline-none focus:ring-2 focus:ring-[#0095F6]/50"
      aria-label="Open view once Blink photo"
    >
      <div className="flex items-center justify-between gap-3">
        <BlinkBadge />
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
          {timeFormatted}
        </span>
      </div>
      <div className="text-[13px] font-semibold text-[#0095F6] dark:text-[#38BDF8] group-hover:underline">
        Tap to view · View once
      </div>
    </button>
  );
}
