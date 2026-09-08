# Discuss VNext Median and Android Contract

Last updated: 2026-09-08

`platformAdapter` is the only platform boundary for Median detection, bridge access, OneSignal bridge discovery, location prompts and native navigation. Normal web/PWA execution never invokes Median APIs.

Median OneSignal identity is synchronized to the Firebase UID after auth restoration. The callback `median_onesignal_notification_opened` resolves notification data through the shared deep-link normalizer. Supported links include local paths, `https://discussit.in/...`, `https://www.discussit.in/...`, and `discuss://...`; external/script URLs fall back to home.

The checked-in Capacitor Android compatibility project preserves `com.discuss.app`, disables mixed content, declares notification/camera/audio/location permissions, and registers verified Discuss HTTPS and custom-scheme deep links. Median dashboard configuration is external and must point at the same production origin and OneSignal app.

Physical-device verification is intentionally recorded separately because it cannot be inferred from a build or emulator.
