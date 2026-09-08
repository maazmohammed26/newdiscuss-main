# Discuss — Production Console & Runtime Reliability Audit

## 1. Executive Summary

This document details the runtime reliability, asset resilience, and console cleanliness patch applied across Discuss VNext.

---

## 2. Firebase Realtime Database Index Patch

### Query Pattern Analysis
Discuss VNext queries multiple RTDB nodes with `orderByChild` and `equalTo`. Without explicit `.indexOn` rules in Firebase security rules, the Firebase SDK logs `[FIREBASE WARNING] Using an unspecified index. Consider adding ".indexOn": "..."` to the developer console.

### Recommended RTDB Rules Patch
Apply the following indexing rules to Firebase Realtime Database:

```json
{
  "rules": {
    "posts": {
      ".indexOn": ["timestamp", "author_id", "type"]
    },
    "pulses": {
      ".indexOn": ["createdAt", "userId"]
    },
    "notifications": {
      "$userId": {
        ".indexOn": ["createdAt", "read"]
      }
    },
    "chats": {
      ".indexOn": ["updatedAt"]
    },
    "relationships": {
      "$userId": {
        ".indexOn": ["status", "updatedAt"]
      }
    }
  }
}
```

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

## 5. Auxiliary Auth 503 Exponential Cooldown Backoff

### Issue
When secondary auxiliary auth backend services were temporarily unconfigured or rate-limited (HTTP 503 Service Unavailable), client-side auth state checks polled continuously, producing repeated console error stacks.

### Resolution
Updated `frontend/src/lib/auxiliaryAuth.js`:
1. **5-minute Cooldown**: On receiving HTTP 503, sets a 5-minute cooldown timer during which secondary auth checks return cached unauthenticated state immediately.
2. **In-flight Deduplication**: Multiple simultaneous auth checks share the same in-flight promise rather than firing redundant network requests.
3. **Graceful Fallback**: The core Discuss platform continues running uninterrupted on primary Firebase authentication.

---

## 6. Verification Status

- Build: **Passed (0 errors)**
- Test Suites: **25 passed, 25 total**
- Runtime Console: **Zero unhandled exceptions or missing reference errors**
