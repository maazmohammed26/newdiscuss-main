import { useState, useEffect, useRef } from 'react';
import DiscussLogo from '@/components/DiscussLogo';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

/**
 * LoadingScreen — timeout-aware loading UI
 *
 * Stages:
 *  0–4s   : Spinner + "Checking authentication…"
 *  4–8s   : Spinner + "Taking longer than expected…" (slow network warning)
 *  8s+    : WifiOff icon + "Something went wrong. Try refreshing." + Retry button
 *
 * Dark mode works via Tailwind's class-based dark mode (class="dark" on <html>).
 */
export default function LoadingScreen({ message = 'Loading...' }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const isAuthCheck =
    message.toLowerCase().includes('auth') ||
    message.toLowerCase().includes('checking');

  let displayMessage = message;
  let showSlowWarning = false;
  let showRetry = false;

  if (isAuthCheck) {
    if (elapsed >= 8) {
      displayMessage = 'Something went wrong. Try refreshing.';
      showRetry = true;
    } else if (elapsed >= 4) {
      displayMessage = 'Taking longer than expected…';
      showSlowWarning = true;
    }
  }

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-[#F5F5F7] dark:bg-[#0F172A] z-50 flex flex-col items-center justify-center">
      {/* Logo — with subtle fade when stuck */}
      <div
        className="relative transition-opacity duration-500"
        style={{ opacity: showRetry ? 0.45 : 1 }}
      >
        <DiscussLogo size="xl" />
      </div>

      {/* Spinner + message */}
      <div
        key={displayMessage}
        className="flex items-center gap-2 mt-6 text-[#64748B] dark:text-[#94A3B8]"
        style={{ fontSize: '13px' }}
      >
        {!showRetry && (
          <Loader2
            size={14}
            className="animate-spin flex-shrink-0"
          />
        )}
        {showRetry && (
          <WifiOff
            size={14}
            className="flex-shrink-0 text-red-500"
          />
        )}
        <span style={{ color: showRetry ? '#EF4444' : undefined }}>
          {displayMessage}
        </span>
      </div>

      {/* Slow network hint */}
      {showSlowWarning && !showRetry && (
        <p
          className="text-[#64748B] dark:text-[#94A3B8] mt-2 text-center px-8"
          style={{ fontSize: '11px', opacity: 0.7, maxWidth: 260 }}
        >
          Your network may be slow or restricted. Please wait…
        </p>
      )}

      {/* Retry button */}
      {showRetry && (
        <button
          onClick={handleRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] active:scale-95 transition-all"
          style={{ fontSize: '13px', fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <RefreshCw size={13} />
          Refresh page
        </button>
      )}

      {/* Animated loading dots (hidden when showing retry) */}
      {!showRetry && (
        <div className="flex gap-1.5 mt-6">
          <div
            className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce"
            style={{
              animationDelay: '0ms',
              opacity: showSlowWarning ? 0.35 : 1,
              transition: 'opacity 0.5s',
            }}
          />
          <div
            className="w-2 h-2 bg-[#3B82F6] rounded-full animate-bounce"
            style={{
              animationDelay: '150ms',
              opacity: showSlowWarning ? 0.35 : 1,
              transition: 'opacity 0.5s',
            }}
          />
          <div
            className="w-2 h-2 bg-[#2563EB] rounded-full animate-bounce"
            style={{
              animationDelay: '300ms',
              opacity: showSlowWarning ? 0.35 : 1,
              transition: 'opacity 0.5s',
            }}
          />
        </div>
      )}

      {/* Elapsed counter (subtle debug hint) */}
      {elapsed >= 5 && !showRetry && (
        <p
          className="text-[#64748B] dark:text-[#94A3B8] mt-4"
          style={{ fontSize: '10px', opacity: 0.35 }}
        >
          {elapsed}s
        </p>
      )}
    </div>
  );
}
