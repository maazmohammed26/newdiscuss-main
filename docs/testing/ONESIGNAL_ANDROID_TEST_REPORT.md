# OneSignal Median Android Test Report

Last updated: 2026-09-08

Implementation/static checks complete:

- Median detection and bridge access are isolated in `platformAdapter`.
- Native OneSignal login/logout uses Firebase UID identity.
- Bridge absence degrades without calling native-only APIs on web.
- Median notification-open callback resolves through centralized deep links.
- Android compatibility manifest includes notifications, camera, microphone, location and Discuss deep links; mixed content is disabled.
- Platform/deep-link tests and the production web build pass.

Physical-device evidence is pending because the owner explicitly reserved device/browser testing. Required matrix: Android permission allow/deny/re-enable, foreground/background/killed-app delivery, cold/warm click routing to post/chat/group, sign-out identity removal, account switch, reinstall, camera-only Blink, microphone/call, DevRadar location, process resume, battery optimization and at least two OS versions. Record device model, OS, Median build, OneSignal subscription/external IDs and dashboard delivery receipt for each result before release.
