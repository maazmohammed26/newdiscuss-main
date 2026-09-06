import React from 'react';
import { Camera, Check, Lock, AlertCircle, Eye } from 'lucide-react';
import { isBlinkExpired, isBlinkViewed } from '@/lib/blinkService';
import './Blink.css';

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
  const timeFormatted = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── SENDER VIEW ───────────────────────────────────────────────
  if (isOwn) {
    const groupViewCount = isGroup && message.viewedBy ? Object.keys(message.viewedBy).length : 0;
    const isSingleViewed = !isGroup && message.viewed;
    const screenshotTaker = message.screenshotBy || (isGroup && message.screenshots && Object.values(message.screenshots)[0]?.username);

    return (
      <div className="flex flex-col gap-1.5 max-w-[290px] sm:max-w-[320px]">
        {/* Screenshot alert if platform best-effort signal detected one */}
        {screenshotTaker && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{screenshotTaker} may have captured your Blink.</span>
          </div>
        )}

        <div className="p-3.5 rounded-2xl rounded-br-md bg-[#0095F6] text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[14px] leading-tight">
                  Blink sent
                </span>
                <span className="font-['Grand_Hotel'] text-white/70 text-[18px]">
                  Blink
                </span>
              </div>
              <span className="text-[12px] text-white/80 mt-0.5">
                {expired
                  ? 'Expired'
                  : isGroup
                  ? groupViewCount > 0
                    ? `Viewed by ${groupViewCount} ${groupViewCount === 1 ? 'person' : 'people'}`
                    : 'Waiting to be viewed'
                  : isSingleViewed
                  ? 'Opened'
                  : 'Waiting to be viewed'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-white/70">
            <span>{timeFormatted}</span>
            <Check className={`w-3 h-3 ${isSingleViewed || groupViewCount > 0 ? 'text-blue-200' : ''}`} />
          </div>
        </div>
      </div>
    );
  }

  // ── RECIPIENT VIEW ────────────────────────────────────────────
  // 1. Expired state
  if (expired) {
    return (
      <div className="p-3.5 rounded-2xl rounded-bl-md bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-800 max-w-[270px] select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
              Blink expired
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              24-hour window ended
            </span>
          </div>
        </div>
        <div className="flex justify-end mt-1 text-[10px] text-neutral-400">
          {timeFormatted}
        </div>
      </div>
    );
  }

  // 2. Already viewed state
  if (viewed) {
    return (
      <div className="p-3.5 rounded-2xl rounded-bl-md bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 max-w-[270px] select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
              Blink opened
            </span>
            <span className="text-[11px] text-neutral-400">
              Cannot be viewed again
            </span>
          </div>
        </div>
        <div className="flex justify-end mt-1 text-[10px] text-neutral-400">
          {timeFormatted}
        </div>
      </div>
    );
  }

  // 3. Unopened & ready to view state
  return (
    <button
      type="button"
      onClick={() => onOpenBlink(message)}
      className="text-left p-3.5 rounded-2xl rounded-bl-md bg-gradient-to-br from-white via-white to-sky-50/50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-850 text-neutral-900 dark:text-white border border-[#0095F6]/40 dark:border-[#0095F6]/30 shadow-sm hover:border-[#0095F6] dark:hover:border-[#0095F6] transition-all max-w-[280px] blink-bubble-pulse cursor-pointer group active:scale-[0.99]"
      aria-label="Open view once Blink photo"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0095F6]/10 dark:bg-[#0095F6]/20 text-[#0095F6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Camera className="w-5 h-5 text-[#0095F6]" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[14px] text-[#0095F6] leading-tight">
              Tap to view Blink
            </span>
            <span className="font-['Grand_Hotel'] text-neutral-400 dark:text-neutral-500 text-[18px]">
              Blink
            </span>
          </div>
          <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            View once · Expires in 24h
          </span>
        </div>
      </div>

      <div className="flex justify-end mt-1.5 text-[10px] text-neutral-400">
        {timeFormatted}
      </div>
    </button>
  );
}
