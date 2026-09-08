# Discuss Median and Android Audit

Audit date: 2026-09-08  
Status: source audit complete; physical-device behavior unverified

## Native surfaces found

The repository contains two native delivery concepts:

1. A checked-in Capacitor Android project with application ID `com.discuss.app`, a minimal `BridgeActivity`, and `webDir: build`.
2. Browser code intended to run inside Median/GoNative, detected through `window.median`, `window.gonative`, or user-agent text. The public landing page links to Play Store package `co.median.android.lpowadz`, which does not match the Capacitor package.

These must be treated as distinct wrappers until the released artifact is identified. A build passing for Capacitor does not validate the Median application.

## Existing bridge behavior

- OneSignal: `pushNotificationService.js` discovers Median/GoNative OneSignal bridges, registers, assigns Firebase UID, sets tags, reads subscription information, and logs out.
- Google auth: `nativeGoogleAuth.js` uses native social-login callbacks; `AuthContext` also supports an encrypted WebView auth relay under `webViewAuth/{flowId}`.
- Geolocation: direct Median calls exist in direct chat, group chat, and `locationPermission.js`.
- Installation/native checks are duplicated in install banners, auth, notification UI, splash screen, and session code.

## Android project findings

- Android manifest declares only `INTERNET`; no explicit camera, microphone, notification, or location permissions are present.
- No deep-link intent filter exists beyond the launcher.
- `google-services.json` is optional; Gradle logs that push will not work when absent.
- No OneSignal Android dependency/plugin is declared in the checked-in Capacitor Gradle app.
- Release minification is disabled and version remains `1.0`/code 1.
- Mixed content is allowed in Capacitor configuration.
- There are only generated example Android tests.

## Architecture gaps

- There is no single platform adapter for detection, permissions, sharing, navigation, camera, native notifications, or deep-link dispatch.
- Business components execute native bridge APIs directly.
- Viewport and platform concerns are sometimes mixed.
- No canonical deep-link resolver is shared by web, PWA, and Median payloads.
- No developer diagnostics panel exposes bridge readiness, identity, subscription, permission, worker, and last-delivery/open state.

## Required validation

Source inspection cannot validate Median bridge availability, FCM credentials, native OneSignal configuration, package/signing identity, killed-app delivery, camera/Blink, or notification tap routing. These require a physical device and the deployed Median configuration. Until that evidence exists, Android push must be described as unverified rather than complete.

## Safe migration direction

Add a central platform contract with web/PWA/Median implementations; preserve current bridge fallbacks behind it; centralize deep-link parsing; then migrate call sites incrementally. Do not change package identifiers, signing, or create a Firebase Android app without confirming the released wrapper configuration.
