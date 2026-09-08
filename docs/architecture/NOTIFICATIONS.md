# Discuss VNext Notifications

Last updated: 2026-09-08

Application code emits typed events through `notificationService`. `/api/notification-event` verifies the Firebase bearer token and origin, validates event type/IDs/recipients, rate-limits actors, renders server-owned text, transactionally deduplicates in-app records, checks recipient preferences, and fans out to OneSignal, Telegram and Discord. Stable outbox operation IDs are notification event IDs for message retries.

Supported events are direct/group message, comment/reply, post/Pulse like, friend request/accept, group join acceptance, Blink, and report acknowledgement. Provider failures are logged and never roll back the underlying user content. OneSignal, Telegram, Discord and Brevo secrets exist only in server environment variables.

In-app notification reads use a newest-50 realtime query and retain at most 200 local records per recipient. The `/notifications` page supports individual and bulk read state.

OneSignal external identity is the Firebase UID. Browser/PWA uses the Web SDK and scoped `/push/onesignal/OneSignalSDKWorker.js`; Median uses its native bridge. Login calls OneSignal login and logout clears identity. The root worker retains legacy OneSignal import compatibility while `/sw-push.js` owns app-shell/offline behavior.

In development, run `await window.__DISCUSS_NOTIFICATION_DIAGNOSTICS__()` in the console to inspect platform, UID/external ID, subscription ID, permission, worker registrations, Median readiness, and last send/open results. This hook is absent from production builds.
