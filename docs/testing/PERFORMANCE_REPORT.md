# Discuss VNext Performance Report

Last updated: 2026-09-08

## Automated baseline

| Check | Result |
|---|---|
| Pre-migration unit tests | 91/91 passed |
| Current unit tests | 100/100 passed |
| Production build | Passed |
| Main bundle after first slice | 258.85 kB gzip |
| Feed page size | 20 posts |
| Realtime feed-head bound | 20 posts |
| Maximum repository page size | 50 posts |
| Cache retention | 300 posts / 20 page descriptors |
| Scroll prefetch threshold | 600 px |

The main bundle increased by approximately 170 bytes gzip across the first implementation/build iterations; no new runtime dependency was added.

## Structural read improvement

Before the migration, Home fetched complete posts, votes, primary comments, and secondary comments trees and then attached listeners to three complete primary nodes.

Home now fetches one 21-record post query (20 displayed plus one look-ahead), enriches only those displayed post IDs, and listens only to the newest 20 post records. Older pages are fetched on demand.

## Measurements still required

Live Firebase bytes/read counts, cache-hit paint timing, cache-miss paint timing, long-scroll memory, slow-network behavior, and physical PWA/Median startup cannot be measured from unit/build execution. These must be captured against preview with representative production-scale data before the final acceptance report.
