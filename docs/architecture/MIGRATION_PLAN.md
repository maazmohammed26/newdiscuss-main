# Discuss VNext Migration Plan

Audit date: 2026-09-08

## Guardrails

- `pre-vnext-backend` is the read-only restore tag for the pre-migration state.
- No phase performs a bulk production rewrite.
- Every remote schema change is additive and keeps compatibility reads.
- Each phase ends with build, test, focused verification, documentation, and an independent commit.
- Tech News/Jobs history remains untouched even after their active clients are removed.

## Phased implementation

### Phase 0 — audit and checkpoint

Create the required audit documents, record baseline build/test results, identify data-safety constraints, and tag the untouched commit. Exit gate: audit documents committed; 91 tests and production build passing.

### Phase 1 — contracts and repository foundation

Add canonical application errors, entity normalizers, repository interfaces, Firebase source adapters, and compatibility exports. Keep existing UI operational. First consumer: feed reads.

### Phase 2 — one versioned local database

Evolve `discuss_cache` additively with feed pages, profiles, notifications, drafts, outbox, sync state, and cache metadata. Preserve existing stores and migrate without clearing. Reduce large localStorage mirrors only after IndexedDB startup behavior is verified.

### Phase 3 — paginated local-first feed

Implement `orderByChild('timestamp')` cursor pages, a bounded feed-head listener, cache-first hydration, merge/deduplication, and scroll-threshold prefetch. Loaded-post vote/comment enrichment must avoid global trees. Preserve current post shape through an adapter.

### Phase 4 — sync/outbox

Add durable operation IDs, pending/syncing/failed/completed states, bounded exponential retry, non-retryable error classification, online resume, and cross-tab leader coordination. Start with one low-risk mutation before likes/messages.

### Phase 5 — chat and groups

Load cached recent messages first, query bounded history pages, retain bounded realtime tails, use durable client message IDs, expose sending/sent/failed, and provide retry. Remove 1,000/100,000-history defaults after regression tests.

### Phase 6 — notification event layer

Create durable in-app notification records and a server event/delivery service. Centralize preferences, self-event exclusions, deduplication, logs, and provider adapters.

### Phase 7 — OneSignal verification and repair

Keep Firebase UID identity, remove server-secret fallbacks from browser naming, add a protected diagnostics panel, validate workers/deep links, and record live web/PWA/physical Android evidence.

### Phase 8 — Telegram hardening

Move all bot-token operations server-side, add timeout/retry/idempotency and sanitized logs, and guarantee Telegram failure cannot roll back the primary action.

### Phase 9 — PWA hardening

Prefix-scope cache cleanup, create a versioned app-shell update path, add bounded runtime cache policy, preserve OneSignal compatibility URLs, and test installed upgrades/offline launch.

### Phase 10 — Median hardening

Introduce the platform/deep-link adapters, migrate direct bridge calls, verify wrapper identity/configuration, and run the physical device matrix.

### Phase 11 — remaining repositories

Migrate profiles, relationships, comments, stories, Pulse, DevRadar, Blink, calls, reporting, and AI boundaries without changing remote IDs or node names.

### Phase 12 — remove Tech News and Tech Jobs

Remove routes, navigation, pages, admin UI, static seed data, exclusive scripts/services, and active `techNews`/`jobs` reads/writes. Add compatibility redirects. Do not delete remote nodes.

### Phase 13 — proven dead-code cleanup

Delete only candidates with no imports, routes, runtime references, worker/deployment references, or native callbacks. Remove unused dependencies after clean install/build verification.

### Phase 14 — security

Deploy least-privilege RTDB rules per database, declare indexes with their queries, remove browser secrets, enforce server authorization/rate limits, and test ownership/membership/Blink access.

### Phase 15 — regression and performance

Run the complete surviving feature matrix, instrument read counts/startup/cache return, verify offline and cross-tab behavior, complete physical device testing, and document rollback/deployment gates.

## First implementation slice

The first code slice after this audit is intentionally vertical: canonical errors + versioned local store + feed repository + bounded Firebase cursor page + cached feed hydration + tests. It produces user-visible startup/read improvements without changing production data.

Status: implemented and verified on 2026-09-08. The next slice is the durable outbox/sync foundation.
