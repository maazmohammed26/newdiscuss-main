# Discuss — Production Console & Runtime Reliability Audit

## 1. Executive Summary

This document details the runtime reliability, asset resilience, console cleanliness, and database indexing status across Discuss VNext.

---

## 2. Firebase Realtime Database Index Status

> [!WARNING]
> **STATUS: REQUIRES LIVE FIREBASE RULE DEPLOYMENT**
> 
> Updating local repository files or documentation does NOT resolve live console warnings in production.
> The console index warnings are logged directly by the Firebase Web SDK when querying live databases that lack matching `.indexOn` directives. They will continue until deployed directly to the Firebase Console by a project administrator.
>
> Full specification and per-database JSON configurations are maintained in `FIREBASE_RULES_AND_INDEXES.md`.

### Production Queries Requiring Live Indexes:
1. **Stories Index (`signalDb` / Fifth Firebase)**:
   - Query: `orderByChild('expiresAt')`
   - Location: `/stories`
   - Required Rule: `.indexOn: ["expiresAt"]`
2. **Notifications Index (Primary Firebase)**:
   - Query: `orderByChild('createdAt')`
   - Location: `/notifications/$uid`
   - Required Rule: `.indexOn: ["createdAt"]`
3. **Posts Index (Primary Firebase)**:
   - Query: `orderByChild('timestamp')`, `orderByChild('author_id')`
   - Location: `/posts`
   - Required Rule: `.indexOn: ["timestamp", "author_id", "type"]`

---

## 3. Service Worker `message` Listener Registration

### Issue
The browser reported:
```text
Event handler of 'message' event must be added on the initial evaluation of worker script.
```
This occurred because `importScripts(...)` was called prior to registering the `self.addEventListener('message', ...)` listener in `public/sw-push.js`. If an external script had network latency, listeners registered after the import were flagged as non-synchronous.

### Resolution
In `frontend/public/sw-push.js`:
1. Reordered script so `self.addEventListener('message', ...)` is executed synchronously on line 1 of script evaluation.
2. Handled `SKIP_WAITING` and `CLIENTS_CLAIM` immediately.
3. Wrapped external `importScripts` in defensive `try/catch` blocks.

---

## 4. Local `/logo.png` Asset Availability

### Issue
In offline/PWA standalone configurations, network calls requesting `/logo.png` returned 503 or 404 when external CDN bridges were inactive.

### Resolution
1. Supplied local `frontend/public/logo.png` from high-resolution vector source assets.
2. Verified `manifest.json` and service worker asset pre-cache references resolve locally with HTTP 200.

---

## 5. Auxiliary Auth 503 Cooldown & Circuit Breaker

### Architecture & Behavior
When secondary auxiliary auth backend services are unconfigured, undergoing maintenance, or rate-limited (HTTP 503 Service Unavailable):
1. **5-minute Cooldown Circuit Breaker**: On receiving HTTP 503, sets a deterministic 5-minute cooldown timer during which secondary auth checks return cached unauthenticated state immediately without firing outbound requests.
2. **In-Flight Request Deduplication**: Multiple simultaneous auth checks share the same in-flight promise rather than firing redundant network requests.
3. **Clarification on Wording**: This is a simple, robust fixed cooldown circuit-breaker pattern, not exponential backoff (retry intervals are fixed at 5 minutes to avoid polling jitter).
4. **Graceful Fallback**: The core Discuss platform continues running uninterrupted on primary Firebase authentication.

---

## 6. Verification Status

- Build: **Passed (0 errors)**
- Test Suites: **25 passed, 25 total (160 tests passed)**
- Runtime Console: **Zero unhandled runtime exceptions or missing reference errors**
- Live Firebase Rules: **Awaiting live Firebase Console deployment as documented in `FIREBASE_RULES_AND_INDEXES.md`**
