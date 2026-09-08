# Discuss VNext PWA

Last updated: 2026-09-08

`/sw-push.js` is the sole root application service worker. It uses cache version 6, network-first navigation, a sanitized cached app-shell key for offline reloads, bounded static asset caching, explicit update activation, notification click messaging and a dedicated offline fallback. OneSignal payloads are ignored by the generic push handler to prevent duplicate notifications.

The OneSignal worker is scoped under `/push/onesignal/`. The root worker imports the OneSignal service-worker SDK only for backward compatibility with existing root-scoped subscribers. The obsolete `/service-worker.js` implementation and deployment header were removed.

The manifest has stable ID/scope/start URL, install icons and feed/chat/notification shortcuts. Validation still required in deployment: HTTPS, manifest fetch, icon dimensions, install prompt policy, offline navigation, worker update from a previously installed release, and live web-push subscription/delivery.
