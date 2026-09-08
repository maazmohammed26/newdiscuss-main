# Discuss Dead Code and Removal Report

Last updated: 2026-09-08

Removed after reference searches and successful tests/build:

- Tech News and Tech Jobs routes, pages, navigation, detail/admin/share/apply components and static data.
- Sixth-Firebase News/Jobs readers and writers, plus the News launch broadcaster.
- Obsolete `/service-worker.js` and its deployment header.
- Legacy arbitrary `/api/send-notification`, its browser transport and obsolete tests.
- Unused NVIDIA serverless proxy and development proxy; active AI flows remain on authenticated Gemini/OpenRouter APIs.
- The second `discuss_offline` IndexedDB opener; compatibility caching now uses `discuss_cache`.

Retained intentionally:

- Root `OneSignalSDKWorker.js` and OneSignal import in the root PWA worker for installed-user subscription compatibility.
- PWA install components serving different placements.
- Existing Firebase wrapper modules while surviving feature consumers still depend on their legacy shapes.
- Existing operational reports/runbooks, which are not runtime code.
- Firebase `techNews` and `jobs` data, untouched by this migration.

No package was removed solely from a client import scan because Vercel handlers share `frontend/package.json` and require server packages at deploy time.
