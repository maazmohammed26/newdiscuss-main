# Discuss VNext Regression Report

Last updated: 2026-09-08

Terminal verification completed:

- `npm test -- --watchAll=false --runInBand`: 18 suites, 125 tests, all passed.
- `npm run build`: production bundle compiled successfully.
- New coverage includes feed pagination/merge, outbox leases/retries/deduplication, vote rollback, message ID synchronization/failure retry, notification auth/retry/idempotency, platform detection and deep-link rejection.
- Static reference searches found no active News/Jobs routes/components/writers and no remaining caller of the removed notification endpoint.
- `git diff --check` is used before the final commit.

Android host checks: `npx cap sync android` could not start because the local Node runtime returned `uv_os_get_passwd: ENOMEM`; Gradle could not start because `JAVA_HOME`/Java is absent. These are workstation prerequisites, not passing Android evidence, and are left for the owner environment.

Surviving feature behavior was preserved in code, but authenticated remote Firebase, Cloudinary uploads, calls, camera/Blink, geolocation, installation, push delivery and device permissions cannot be proven without the owner's configured environment. Per owner direction, no browser was opened. Execute the deployment/device matrices in the OneSignal reports before production promotion.
