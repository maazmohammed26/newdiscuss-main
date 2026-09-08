# Discuss PWA Audit

> Phase-0 snapshot. The duplicate worker described below has since been removed; see `PWA.md` for the implemented state.

Audit date: 2026-09-08

## Active setup

- `frontend/src/index.js` registers `/sw-push.js` with root scope after window load and `updateViaCache: none`.
- `/sw-push.js` is the active application worker. It precaches the offline document, icon, and manifest; uses network-first navigation; bypasses Firebase; caches fonts and hashed static assets; and handles generic push/click events.
- OneSignal uses `/push/onesignal/OneSignalSDKWorker.js` under `/push/onesignal/`, a non-overlapping scope.
- Vercel and Netlify set no-cache headers for the active application worker. Vercel also sets them for both OneSignal worker URLs; Netlify currently omits explicit OneSignal worker headers.
- The manifest declares standalone mode, root start URL/scope, portrait orientation, theme/background colors, categories, and 32/180/192/512 pixel icons.

## Conflict and reliability findings

1. `frontend/public/service-worker.js` is a second, older root-scope application worker. It is not registered by current source, but remains publicly accessible and aggressively caches every GET response, including potentially authenticated/dynamic traffic. It is a migration hazard for clients that were registered to it previously.
2. Both root and scoped OneSignal workers exist. The scoped worker is current; the root path should be treated as compatibility until registration telemetry proves it unused.
3. The active worker's activate handler deletes every cache not matching its two current names. This can delete caches owned by prior Discuss workers and possibly provider workers sharing Cache Storage. Cache deletion should be prefix-scoped.
4. Navigation does not serve the cached SPA shell; offline navigation returns `offline.html`. Cached structured data therefore cannot render if a fresh document cannot load. This is offline fallback, not a complete offline app shell.
5. The manifest's `permissions` property is non-standard and does not grant browser permissions.
6. Runtime cache size/age bounds are not implemented for images/static assets.
7. No automated installability/Lighthouse test or worker-upgrade regression test exists.
8. Vercel and Netlify CSP/header definitions differ, so behavior depends on deployment provider.

## Safe migration requirements

- Keep existing worker URLs reachable during staged migration.
- Make the active worker delete only `discuss-*` caches it owns.
- Introduce an app-shell strategy only with versioned rollback and authentication validation.
- Never cache Firebase, auth, or dynamic authenticated API responses.
- Add bounded runtime-cache eviction and worker lifecycle tests.
- Verify installed PWA upgrades from at least the currently deployed worker generation.
