import { useState, useEffect, useRef } from 'react';
import DiscussLogo from '@/components/DiscussLogo';
import { Loader2, WifiOff } from 'lucide-react';

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
  let showRetry = false;

  if (isAuthCheck) {
    if (elapsed >= 10) {
      displayMessage = 'Taking longer than usual. Tap to retry.';
      showRetry = true;
    }
  }

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div id="discuss-loading-screen" className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col items-center justify-between py-12 px-4 select-none">
      <div className="w-full flex-1" />

      {/* Centered Brand Mark */}
      <div className="flex flex-col items-center justify-center gap-4">
        <DiscussLogo size="xl" />

        <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-neutral-400">
          {!showRetry ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0095F6]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#ED4956]" />
          )}
          <span style={{ color: showRetry ? '#ED4956' : undefined }}>{displayMessage}</span>
        </div>

        {showRetry && (
          <button
            onClick={handleRetry}
            className="mt-3 px-4 py-1.5 bg-[#0095F6] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
          >
            Reload
          </button>
        )}
      </div>

      {/* Instagram style Footer branding */}
      <div className="flex-1 flex flex-col items-center justify-end">
        <span className="text-[11px] text-neutral-400 font-medium">from</span>
        <span className="font-script text-xl text-neutral-900 dark:text-white leading-none mt-0.5">Discuss</span>
        <span className="font-script text-sm text-neutral-400 dark:text-neutral-500 leading-none mt-0.5">Bengaluru</span>
      </div>
    </div>
  );
}