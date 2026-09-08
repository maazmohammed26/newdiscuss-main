# Discuss VNext Data Model

Last updated: 2026-09-08

Firebase remains the remote source of truth and all existing paths, UIDs, IDs, timestamps and media URLs remain compatible. This migration performed no production data rewrite or deletion.

## Local model

The single `discuss_cache` IndexedDB database is schema version 7. It contains `posts`, `users`, `profiles`, `friends`, `relationships`, `feed_pages`, `comments`, `chats`, `messages`, `groups`, `group_messages`, `notifications`, `draft_posts`, `draft_messages`, `outbox`, `sync_state`, and `cache_meta`.

Feed pages are keyed by cursor descriptors. Messages retain their remote ID; optimistic messages use the outbox operation ID as both local and eventual remote ID. Compound `chatTimestamp` and `groupTimestamp` indexes support per-thread history. Notification local IDs are namespaced as `{recipientId}:{notificationId}`.

## Remote ownership

| Entity | Remote location | Freshness |
|---|---|---|
| Auth/users/posts/notifications | Primary Firebase | Auth realtime; feed/notifications bounded realtime |
| Comments/profile extensions | Secondary Firebase | Revalidate on use |
| Direct chats/messages | Third Firebase | Cached history plus bounded realtime head |
| Groups/messages/membership | Fourth Firebase | Cached history plus bounded realtime head |
| Signal stories | Fifth Firebase | Realtime with expiry |
| DevRadar | Sixth Firebase | Realtime public locations |
| Media | Existing Cloudinary public IDs/URLs | Immutable URL references |

Auxiliary Firebase clients authenticate with custom tokens minted by `/api/aux-auth-token`. Tokens preserve the primary Firebase UID and require per-project service accounts in the server environment.

The deprecated `techNews` and `jobs` remote nodes are retained untouched but have no active readers or writers.
