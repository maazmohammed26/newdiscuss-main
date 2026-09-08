# Discuss VNext Sync Engine

Last updated: 2026-09-08

## Implemented outbox

The durable outbox lives in the version 6 IndexedDB outbox store. Every operation records:

- operationId
- authenticated userId
- entity type and ID
- operation type
- serializable payload
- created/update/next-attempt timestamps
- attempts and status
- bounded error diagnostics
- tab lease owner and expiry

Statuses are pending, syncing, failed, and completed.

## Processing model

1. The UI writes an operation before remote synchronization.
2. Online callers request an eager flush; offline callers return immediately with pending state.
3. The processor claims at most ten due operations for the current authenticated user.
4. Claimed operations receive a 30-second IndexedDB lease.
5. Registered handlers execute sequentially to preserve same-entity ordering.
6. Success records completed state and an optional local result.
7. Retryable failures return to pending with exponential delay from one to 60 seconds.
8. Validation, permission, auth, unknown non-network failures, and the fifth failed attempt become terminal failed records.
9. A manual retry API resets an owned failed operation.

Completed operations are retained briefly for diagnostics/results and pruned after one day, with the newest 100 retained.

## Multi-tab safety

The browser Locks API serializes flushes when available. IndexedDB claim transactions and expiring per-tab leases are the fallback and crash-recovery mechanism. BroadcastChannel wakes other open Discuss tabs when an operation is queued. A 15-second timer and the online event resume due work.

Only operations matching the current Firebase/Discuss user ID are claimed. Logging into another account cannot flush a previous account's queue.

## First supported mutation: post vote

PostCard and PostDetailPage now compute the desired final vote (up, down, or null), update UI/cache immediately, and enqueue post.setVote. The handler calls an idempotent setVote adapter rather than retrying toggle semantics.

The operation ID is reused as the logical push event ID. A retry that observes the desired upvote already written does not send the like notification again. Existing Telegram/Discord/push behavior remains best effort and will be moved behind the unified server notification event service in its dedicated phase.

## Failure representation

Offline queued votes remain visibly optimistic but are not marked remotely complete in the outbox. Terminal operation diagnostics remain local and can be retried through retryOutboxOperation. A user-facing failed-operation panel is still required before extending the queue to messages or destructive mutations.

## Extension rules

- Register only final-state or otherwise idempotent handlers.
- Never queue a toggle operation whose meaning changes on retry.
- Never process an operation under a different authenticated UID.
- Do not store secrets or full sensitive provider errors in payload/diagnostics.
- Message operations require stable client message IDs before adoption.
