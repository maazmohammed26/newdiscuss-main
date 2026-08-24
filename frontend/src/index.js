import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// ── Service Worker registration ───────────────────────────────────────────────
// Must be registered after the app loads to avoid blocking the first paint.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/',
        // updateViaCache: 'none' ensures the browser always fetches the SW
        // file from the network rather than the HTTP cache, preventing
        // stale SW causing auth issues after deployments.
        updateViaCache: 'none',
      });

      console.log('[SW] Registered:', registration.scope);

      // Prompt user to reload when a new SW version is available
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New content available — post a message to the SW to skip waiting
            worker.postMessage({ type: 'SKIP_WAITING' });
            // Activate silently. The fresh shell is used on the next natural
            // launch instead of interrupting the current screen with a reload.
            console.log('[SW] New version ready for the next launch.');
          }
        });
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

// ── Mount React app ───────────────────────────────────────────────────────────
// NOTE: React.StrictMode is intentionally removed here.
// In development, StrictMode causes every effect (including onAuthStateChanged)
// to run twice, creating duplicate auth subscribers and making auth debugging
// unreliable. This has zero effect on production builds.
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
