# Discuss VNext Cache Strategy

Last updated: 2026-09-08

## Database

The active structured cache is discuss_cache, now at schema version 7 using the existing idb dependency. The upgrade is additive and never clears the database.

Retained stores:

- posts, users, friends
- chats, messages
- comments
- groups, group_messages
- cache_meta

Added VNext stores:

- profiles
- feed_pages
- relationships
- notifications
- draft_posts, draft_messages
- outbox
- sync_state

## Feed policy

- Maximum cached feed posts: 300.
- Maximum cached page descriptors: 20.
- Page metadata records request cursor, next cursor, post IDs, hasMore, and last access time.
- Head metadata records cursor, hasMore, version, last sync/access time, and five-minute stale time.
- Cache writes are best effort; a quota/cache failure does not hide successfully fetched remote data.
- Remote failures do not discard cached content.

When retention is exceeded, the oldest feed posts and least-recently-accessed page descriptors are evicted. No user-authored remote data is touched.

## LocalStorage transition

discuss_fast_* localStorage copies remain temporarily so existing users retain synchronous first paint. IndexedDB is the structured source for the new repository. Large localStorage mirrors will be removed only after startup measurements and all consumers use the local repository.

Small device/UI preferences may remain in localStorage.

## Multi-tab schema upgrades

The database reports blocked upgrades, closes on a newer-version request, and clears its singleton after termination. Outbox flushes use browser locks when available and transactional expiring leases otherwise.

## Outbox retention

Due operations are claimed in batches of ten for the current authenticated user. Completed operations older than one day are pruned while retaining the newest 100 for diagnostics. Failed operations remain until explicitly retried or a later user-facing cleanup policy is implemented.

## Freshness

Current implemented feed freshness:

- cached history: immediate, retained locally;
- feed head: refresh on launch and browser reconnect;
- newest 20 posts: bounded realtime;
- older history: immutable-style cache plus explicit cursor pagination.
