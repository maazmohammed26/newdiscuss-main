# Discuss VNext Performance Report

Last updated: 2026-09-08

| Automated check | Result |
|---|---|
| Unit tests | 125/125 passed across 18 suites |
| Production build | Passed |
| Main bundle | 258.93 kB gzip |
| Feed initial/realtime batch | 20 posts |
| Feed repository hard cap | 50 posts/query |
| Feed cache retention | 300 posts / 20 page descriptors |
| Message listener | 50 recent records |
| Message history page | 50, hard cap 100 |
| Message cache | 500 per conversation/group |
| Notification listener/local cache | 50 / 200 per recipient |
| Feed scroll prefetch | 600 px |

Home no longer downloads the complete post/vote/comment trees. It reads IndexedDB first, fetches one cursor page with look-ahead, enriches displayed IDs only and subscribes only to the newest head. Chat/group no longer increase realtime limits toward lifetime history; older data is explicitly paged.

Live Firebase byte counts, cached paint timing, long-scroll memory and physical PWA/Median startup require a deployed environment and were not fabricated in this terminal-only pass.
