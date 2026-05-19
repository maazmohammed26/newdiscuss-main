import { useState, useEffect, useRef } from 'react';
import DiscussLogo from '@/components/DiscussLogo';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';

/**
 * LoadingScreen — timeout-aware loading UI styled with the premium cinematic dark Discuss theme
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center select-none overflow-hidden">
      <div className="bg-noise absolute inset-0 opacity-[0.08] pointer-events-none" />

      {/* Logo — with subtle fade when stuck */}
      <div
        className="relative transition-opacity duration-500 z-10"
        style={{ opacity: showRetry ? 0.45 : 1 }}
      >
        <DiscussLogo size="xl" />
      </div>

      {/* Spinner + message */}
      <div
        key={displayMessage}
        className="flex items-center gap-2.5 mt-8 text-gray-400 z-10 font-semibold"
        style={{ fontSize: '14px' }}
      >
        {!showRetry && (
          <Loader2
            size={16}
            className="animate-spin flex-shrink-0 text-[#2563EB]"
          />
        )}
        {showRetry && (
          <WifiOff
            size={16}
            className="flex-shrink-0 text-[#DC2626]"
          />
        )}
        <span style={{ color: showRetry ? '#DC2626' : '#E1E0CC' }}>
          {displayMessage}
        </span>
      </div>

      {/* Slow network hint */}
      {showSlowWarning && !showRetry && (
        <p
          className="text-gray-500 mt-3 text-center px-8 z-10 font-medium leading-relaxed"
          style={{ fontSize: '12px', maxWidth: 280 }}
        >
          Your network connection may be slow or restricted. Please wait…
        </p>
      )}

      {/* Retry button */}
      {showRetry && (
        <button
          onClick={handleRetry}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#2563EB] text-white font-bold hover:opacity-95 active:scale-95 transition-all shadow-lg z-10"
          style={{ fontSize: '13px', fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <RefreshCw size={14} />
          Refresh page
        </button>
      )}

      {/* Animated loading dots (thick red and blue, bounce animation) */}
      {!showRetry && (
        <div className="flex gap-2.5 mt-8 z-10 items-center justify-center">
          <div
            className="w-3.5 h-3.5 bg-[#DC2626] rounded-full animate-bounce shadow-[0_0_12px_rgba(220,38,38,0.4)]"
            style={{
              animationDelay: '0ms',
              opacity: showSlowWarning ? 0.35 : 1,
              transition: 'opacity 0.5s',
            }}
          />
          <div
            className="w-3.5 h-3.5 bg-[#E1E0CC] rounded-full animate-bounce"
            style={{
              animationDelay: '150ms',
              opacity: showSlowWarning ? 0.35 : 1,
              transition: 'opacity 0.5s',
            }}
          />
          <div
            className="w-3.5 h-3.5 bg-[#2563EB] rounded-full animate-bounce shadow-[0_0_12px_rgba(37,99,235,0.4)]"
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
          className="text-gray-600 mt-5 z-10 font-mono"
          style={{ fontSize: '10px', opacity: 0.35 }}
        >
          {elapsed}s
        </p>
      )}
    </div>
  );
}
