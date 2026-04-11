import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register the push-enabled service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      console.log('[App] Service Worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New service worker available');
            }
          });
        }
      });
    } catch (error) {
      console.error('[App] Service Worker registration failed:', error);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
