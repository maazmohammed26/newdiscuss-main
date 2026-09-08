# Discuss VNext Data Layer

Last updated: 2026-09-08

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| Feature hook | UI lifecycle, loading/error state, scroll-aware behavior |
| Repository | Local/remote coordination, cache fallback, stable contract |
| Remote source | Firebase queries, snapshots, legacy-shape normalization |
| Local cache | IndexedDB persistence, metadata, retention |
| React component | Rendering and interaction only |

## Feed repository contract

- readCached(limit): returns cached posts, oldest loaded cursor, hasMore, and cache time.
- fetchPage(cursor, limit): requests a bounded remote page and persists it without making cache failure fatal.
- subscribeHead(handlers): subscribes to a bounded latest-post query, persists upserts/removals, and returns an exact unsubscribe function.
- mergeFeedPosts(current, incoming): stable-ID deduplication with newest-first order.

## Cursor contract

A cursor contains the ordered child value and Firebase key:

~~~js
{
  timestamp: '2026-09-08T12:34:56.000Z',
  id: '-FirebasePushKey'
}
~~~

The key breaks ties between equal timestamps. Older pages use endBefore(timestamp, id) plus limitToLast(pageSize + 1). The extra record establishes hasMore without offset pagination.

## Enrichment contract

For compatibility with the current PostCard, each fetched post includes vote totals, comment total, and vote map. These are read only for the loaded page, never from global vote/comment trees. Reads are concurrency-bounded in groups of five posts. A later denormalized summary migration can reduce these bounded lookups further.

## Errors

AppError provides stable categories and retryability without exposing raw Firebase errors to the UI. Current categories match the PRD: network, auth, permission, not found, conflict, rate limit, validation, media, notification, and unknown.

## Legacy coexistence

lib/db.js remains the write/legacy-read adapter while the migration is incomplete. New feature code must not add direct Firebase calls to React components; it should add a source and repository under src/data.

## Mutation path

The first migrated write follows UI -> vote repository -> IndexedDB outbox -> registered sync handler -> Firebase. Vote operations store the desired final value rather than a toggle command, so replay cannot invert the user's intent.
