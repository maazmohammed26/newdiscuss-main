# Discuss VNext Architecture

Last updated: 2026-09-08

The implemented path is `React UI -> feature hook/repository -> discuss_cache IndexedDB -> durable outbox/sync -> Firebase/server APIs`. Firebase and Cloudinary remain the source of truth; no existing path, UID, ID or media reference was rewritten.

Feed uses a cached first paint, 20-record cursor pages, a bounded 20-record realtime head and scroll prefetch. New head records are buffered while the user is down-page. Direct and group conversations load cached messages first, listen to a bounded recent window, paginate older records with timestamp/ID cursors, and merge by stable ID.

Post votes and direct/group sends use the durable outbox. It has stable operation IDs, pending/syncing/failed states, bounded exponential retry, stale-lease recovery, cross-tab locking and online/startup replay. Message operation IDs become Firebase message keys, making remote retries idempotent.

`discuss_cache` version 7 is the only active IndexedDB database. Retention is bounded for feed pages/posts, messages per thread, and notifications. Schema upgrades are additive.

Notifications use typed authenticated events, transactionally deduplicated in-app records and server-side OneSignal/Telegram/Discord fan-out. Web/PWA and Median share Firebase UID identity but use separate platform adapters and delivery SDK paths.

PWA navigation is network-first with a cached app shell/offline fallback. `/sw-push.js` owns root scope; the OneSignal worker uses its dedicated scope with a root compatibility import for existing subscriptions.

Tech News and Tech Jobs routes, navigation, pages, admin UI, writers, static content and launch broadcaster are removed. Their historical Firebase nodes are explicitly preserved.
