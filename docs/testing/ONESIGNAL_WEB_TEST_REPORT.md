# OneSignal Web and PWA Test Report

Last updated: 2026-09-08

Static/terminal checks complete:

- OneSignal REST key has no browser code path.
- Firebase UID is passed to `OneSignal.login` and logout clears identity.
- Web SDK worker path/scope and PWA root worker are distinct.
- Generic push ignores OneSignal payloads to avoid duplicates.
- Notification event IDs survive auth/transient retry and server records are transactionally deduplicated.
- Deep links accept Discuss hosts/local paths/custom scheme and reject external/script URLs.
- Production build and notification/platform unit tests pass.

Live verification pending owner environment: fresh permission grant, existing subscriber upgrade, foreground/background delivery, installed-PWA delivery, multi-device external-ID delivery, click routing, preference opt-out, provider dashboard delivery receipt and offline/reconnect behavior. Use the development diagnostic function documented in `NOTIFICATIONS.md` during preview testing.
