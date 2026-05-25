import { useState, useEffect } from 'react';

/**
 * useOnlineStatus — tracks real network connectivity.
 *
 * Uses both the browser's online/offline events AND a periodic
 * lightweight HEAD fetch to detect "connected but captive portal / 
 * restricted network" scenarios (common on corporate WiFi).
 *
 * Returns: { isOnline: boolean, wasOffline: boolean }
 *  - isOnline:   true while connected
 *  - wasOffline: true if the user was offline during this session
 *               (useful for showing "back online" toasts)
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let probeInterval = null;

    const goOnline = () => {
      setIsOnline(true);
    };

    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    // Listen to native browser events (fires instantly)
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Periodic deep probe — catches captive portals & restrictive networks
    // where navigator.onLine lies (shows true but no real connectivity)
    const probe = async () => {
      try {
        // Lightweight no-cache HEAD request to a highly-available endpoint.
        // We use Google's generate_204 which returns a tiny 204 response.
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), 4000);
        await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timerId);
        setIsOnline(true);
      } catch {
        // Fetch failed → no real connectivity
        setIsOnline((prev) => {
          if (prev) setWasOffline(true);
          return false;
        });
      }
    };

    // Run probe immediately, then every 30 seconds
    probe();
    probeInterval = setInterval(probe, 30_000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(probeInterval);
    };
  }, []);

  return { isOnline, wasOffline };
}
