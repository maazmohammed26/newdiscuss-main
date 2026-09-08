# Discuss VNext Rollback Plan

Last updated: 2026-09-08

## Restore points

- pre-vnext-backend points to the untouched commit 61fdbe7.
- Phase 0 audit commit: 2c12266.
- Each following vertical migration slice is committed independently.

## Feed rollback

If the VNext feed path fails before deployment, revert the local-first feed commit. This restores FeedPage imports of subscribeToPostsRealtime, cachePosts, and getFastCachedPosts.

The version 7 IndexedDB upgrade is additive. Rolling the code back to a client that opens an earlier version would produce an IndexedDB VersionError, so a deployed rollback must retain localDatabase.js at version 7 (or release a compatibility patch that opens version 7) even if a repository is disabled. Never respond by clearing all user cache.

## Remote safety

The current slice performs reads only against existing feed/vote/comment paths and writes only browser-local cache. It requires no remote data rollback and introduces no production migration.

The outbox writes existing votes/{postId}/{uid} values using the same up/down/null model as the legacy toggle and messages under stable operation IDs. To roll it back, stop new queueing first, allow or inspect pending operations, then restore direct consumers while retaining local database version 7. Do not delete pending outbox rows automatically.

## Deployment rollback sequence

1. Stop rollout at preview/staging.
2. Capture browser console, worker state, IndexedDB version, failing query, and affected platform.
3. Revert only the failing phase commit.
4. Preserve the highest deployed local schema version.
5. Run tests and production build.
6. Deploy preview, validate cached and cache-miss startup, then promote.

Do not force-push or rewrite published Git history because the repository is connected to Lovable.
