# Discuss Dead Code and Removal Audit

Audit date: 2026-09-08  
Policy: candidates only; no deletion during Phase 0

## Confirmed product removal scope

The PRD explicitly removes Tech News and Tech Jobs. Active code currently includes:

- Routes/lazy imports in `frontend/src/App.js`.
- Navigation in `Header.js`, `Sidebar.js`, `ExploreMenuModal.js`, and `Footer.js`.
- Pages `NewsPage.js`, `NewsDetailPage.js`, `JobsPage.js`, and `JobDetailPage.js`.
- Admin components `NewsAdminModal.js` and `JobAdminModal.js`.
- Sharing/application components `ItemShareModal.js` and `GuestApplyPopup.js` (appear exclusive to these modules; verify immediately before deletion).
- Static `assets/naukri_news_data.js`.
- Sixth-database CRUD/subscriptions for `techNews` and `jobs`.
- Root `sendNewsBroadcast.js`.

These are active, not dead. They must be removed only in the dedicated removal phase after surviving features pass. Remote `techNews` and `jobs` nodes are deprecated historical data and must not be deleted.

## High-confidence cleanup candidates

| Candidate | Evidence | Required safety check |
|---|---|---|
| `frontend/public/service-worker.js` | Current entry registers `/sw-push.js`; old worker has unsafe catch-all caching | Verify production registrations and provide a safe unregister/migration path before removal |
| Root `/OneSignalSDKWorker.js` | Current Web SDK config uses scoped `/push/onesignal/OneSignalSDKWorker.js` | Verify no active OneSignal subscriber uses the root worker URL |
| Root `sendNewsBroadcast.js` | Content is exclusively the removed News/Jobs launch campaign | Confirm no scheduled/manual deployment reference |
| Generated Android example tests | Default Capacitor placeholders | Replace with meaningful tests before deleting |

## Duplicate/overlapping implementations

- `lib/db.js` and `lib/cacheManager.js` own different IndexedDB databases with overlapping posts/users/cache responsibilities.
- `cloudinary.js` and `imagekit.js` both use Cloudinary configuration and need consumer/behavior comparison.
- PWA install UI exists in `AppInstallBanner.js`, `PWAInstallBanner.js`, and `PWAInstallPrompt.js`; these may serve different placements and are not yet deletion candidates.
- OneSignal has root and scoped worker files for possible compatibility.
- Native-wrapper detection is repeated across multiple components/services and should be consolidated, then removed from consumers.
- UI component libraries exist in both `frontend` and `Discuss Animation Studio`; they belong to separate applications and are not duplicates eligible for cross-project deletion.

## Unused-dependency candidates

The production dependency list includes browser-inappropriate server packages (`firebase-admin`, `livekit-server-sdk`, `web-push`). They may be required by Vercel handlers located inside `frontend`, so a simple client import scan is not sufficient. Packaging/deployment must be split or verified before moving/removing them. No dependency is removed during this audit.

## Stale documentation and scripts

The repository root contains many implementation/fix reports and operational scripts. They are not runtime code. Consolidation may improve maintainability, but they must be checked for deployment/runbook value and historical evidence before deletion.

## Deletion proof checklist

Before deleting any candidate, search static imports, dynamic imports, route definitions, function/string references, Firebase paths, HTML/public references, deployment config, service-worker URLs, Median callbacks, Cloud Functions exports, and manual/scheduled runbooks. Then run clean tests and build in the same change.
