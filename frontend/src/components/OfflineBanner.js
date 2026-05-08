import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, Wifi, X } from 'lucide-react';

/**
 * OfflineBanner — renders a sticky banner at the top of the viewport
 * when the user loses network connectivity.
 *
 * Features:
 *  • "Offline" tag: amber badge shown immediately when offline
 *  • "Back online" confirmation: brief green banner when reconnected
 *  • Auto-dismisses after 4 seconds when back online
 *  • Entirely accessible (aria-live region)
 */
export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // When we come back online after being offline, show "reconnected" banner
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setDismissed(false);
      const t = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  // Reset dismissed state when going offline again
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
      setShowReconnected(false);
    }
  }, [isOnline]);

  // Nothing to show — user is online and was never offline
  if (isOnline && !showReconnected) return null;
  // User dismissed the offline banner
  if (dismissed && !isOnline) return null;

  // ── Back-online banner ──────────────────────────────────────
  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 2px 12px rgba(22,163,74,0.35)',
          animation: 'slideDown 0.25s ease-out',
        }}
      >
        <Wifi size={14} />
        <span>Back online</span>

        <style>{`
          @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ── Offline banner ──────────────────────────────────────────
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '10px 40px 10px 16px',
        background: 'linear-gradient(135deg, #b45309, #92400e)',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 2px 12px rgba(180,83,9,0.35)',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <WifiOff size={14} style={{ flexShrink: 0 }} />

      {/* "OFFLINE" tag */}
      <span
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '4px',
          padding: '1px 6px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Offline
      </span>

      <span style={{ fontWeight: 400 }}>
        No internet connection. The app is running in offline mode.
      </span>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notification"
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.75)',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
