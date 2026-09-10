import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { getNotificationDiagnostics } from "@/lib/pushNotificationService";

// ── Service Worker registration ───────────────────────────────────────────────
// Must be registered after the app loads to avoid blocking the first paint.
// Registered ONLY in production to avoid stale cached bundles and dev hot-reload issues.
if ('serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw-push.js', {
          scope: '/',
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
              console.log('[SW] New version ready for the next launch.');
            }
          });
        });
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    });
  } else {
    // In development mode, unregister any active service worker and clear stale caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('[SW] Unregistered development service worker:', registration.scope);
        });
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

// ── Mount React app ───────────────────────────────────────────────────────────
// NOTE: React.StrictMode is intentionally removed here.
// In development, StrictMode causes every effect (including onAuthStateChanged)
// to run twice, creating duplicate auth subscribers and making auth debugging
// unreliable. This has zero effect on production builds.
const root = ReactDOM.createRoot(document.getElementById("root"));
if (process.env.NODE_ENV !== 'production') {
  window.__DISCUSS_NOTIFICATION_DIAGNOSTICS__ = getNotificationDiagnostics;
}
root.render(<App />);
