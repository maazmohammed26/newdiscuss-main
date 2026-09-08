# Discuss VNext Architecture

Last updated: 2026-09-08

## Implemented foundation

The migration now has its first production path:

~~~text
FeedPage
   |
useFeed feature hook
   |
FeedRepository
   |----------------------|
FirebaseFeedSource      FeedCache
   |                      |
Firebase RTDB          discuss_cache v6
~~~

The repository boundary owns coordination between the remote source and local cache. The React page owns only display state and user interaction. Existing post shapes remain compatible with PostCard.

## Feed behavior

1. Synchronous legacy fast cache can paint immediately during the compatibility period.
2. Versioned IndexedDB cache loads and merges persisted feed history.
3. A 20-item Firebase cursor page refreshes the feed head.
4. A bounded 20-item realtime query merges new/changed posts.
5. Scroll proximity (600 px root margin) loads one older page at a time.
6. Posts arriving while the user is far down the page are buffered behind a “new posts” control.
7. Loaded pages are deduplicated by stable Firebase post ID and sorted by timestamp.

The old getPosts() and subscribeToPostsRealtime() functions remain available for unmigrated consumers, but Home no longer calls them.

## Compatibility and safety

- Firebase remains the source of truth.
- No remote node, ID, field, UID, or media reference is changed.
- The IndexedDB upgrade is additive from version 5 to version 6.
- All old IndexedDB stores and indexes are retained.
- Secondary Firebase initialization now skips safely when its configuration is absent, without changing configured production behavior.
- The first page and realtime head are capped at 20; explicit repository limits are capped at 50.

## Remote query prerequisite

The primary RTDB posts node requires an index on timestamp for server-efficient cursor queries:

~~~json
{
  "posts": {
    ".indexOn": ["timestamp"]
  }
}
~~~

This is a required production rules addition, not a complete replacement ruleset. It must be merged into the current production rules after those rules are exported and reviewed. The repository deliberately does not ship a guessed root rules file.

## Next boundaries

The same pattern will be extended to mutations/outbox, chat history, group history, profiles, relationships, notifications, stories, Pulse, and DevRadar. Compatibility adapters remain until every consumer of a legacy function has moved.
