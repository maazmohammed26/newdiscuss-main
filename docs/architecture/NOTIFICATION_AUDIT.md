# Discuss Notification Audit

> Phase-0 snapshot. The legacy endpoint described below has since been replaced by the typed architecture in `NOTIFICATIONS.md`.

Audit date: 2026-09-08  
Status: implementation present; end-to-end production delivery remains unverified

## OneSignal architecture found

- Browser initialization uses OneSignal Web SDK v16 from `frontend/src/lib/pushNotificationService.js`.
- Web push is configured to use `/push/onesignal/OneSignalSDKWorker.js` with scope `/push/onesignal/`, which avoids taking the root PWA worker scope.
- Both `/OneSignalSDKWorker.js` and the scoped worker exist and import the same SDK. The root file appears to be a compatibility URL and must not be removed until active subscriber/service-worker registrations are measured.
- Auth identity calls use Firebase UID through web `OneSignal.login(uid)` and Median/GoNative bridge login/external ID methods. Logout paths exist.
- Native bridge info is normalized into subscription/player identifiers and stored with the user's primary profile.
- UI permission state is driven partly by browser/OneSignal state and partly by `discuss_notifications_enabled` in localStorage.

## Server delivery

`frontend/api/send-notification.js` is an authenticated Vercel handler. It verifies a Firebase ID token, rate-limits per sender in process memory, loads recipient identifiers, builds a same-origin deep link, optionally suppresses preview text, and attempts multiple OneSignal targeting modes. A UUID event ID is passed as the OneSignal idempotency key when possible.

Risks:

- Multiple fallback attempts can still deliver more than once when a prior attempt was accepted but reported ambiguously.
- Delivery attempts are console-only and not persisted as an event/delivery ledger.
- Preference checks are incomplete; preview preference is applied, but per-category push preferences and self-event exclusion are not enforced centrally.
- In-app notification records are not the durable primary event. Push remains invoked directly from feature services.
- The handler accepts `REACT_APP_ONESIGNAL_REST_API_KEY` as a server fallback. That naming encourages accidental client exposure and must be removed after server configuration is verified.
- In-memory rate limiting resets per serverless instance and is not a production-wide abuse control.

## Call sites and duplication

`notificationTransport.js` centralizes authenticated calls to the Vercel endpoint, but business modules still trigger transport and Telegram independently. Current notification producers include direct/group messages, comments, replies, likes, relationships, calls, reports, and signup/admin flows. There is no canonical application-event schema shared by all producers.

## Telegram

Firebase Functions use a managed `TELEGRAM_BOT_TOKEN` secret for the bot webhook. Vercel support/Android-access handlers also send Telegram admin messages. Legacy `frontend/src/lib/telegramService.js` reads bot/admin tokens from `REACT_APP_*` variables and can call Telegram from the browser. Browser-shipped bot tokens are critical secrets and must be eliminated; user actions must write/submit an event to a server boundary instead.

Telegram failures are generally caught so the primary action can continue, but retry, timeout, deduplication, and delivery observability are inconsistent across call sites.

## Other notification/security findings

- Discord notification code reads a browser-exposed bot token.
- Brevo email code has browser paths using a `REACT_APP_*` API key, while Cloud Functions also provide server-side email paths.
- Existing environment files are ignored by Git, but preview/production files on disk contain secret-shaped `REACT_APP_*` keys. Values were not recorded by this audit. Rotation should be considered for any token ever deployed in a browser bundle.

## Verification status

Automated notification unit tests pass, including identity and transport behavior. This is not evidence of live delivery. The following remain required before completion:

- Live HTTPS web subscription and targeted delivery.
- PWA foreground/background/killed-browser behavior and deep-link routing.
- Physical Median Android clean-install, permission, login/logout/account-switch, foreground/background/killed-app, token-refresh, reinstall, and Wi-Fi/mobile-network tests.
- Evidence recorded in the required testing reports.

## Target direction

Feature event -> durable in-app notification/event record -> preference/self-event resolution -> idempotent channel deliveries (OneSignal/Telegram) -> observable delivery result. Firebase UID remains the external identity, and all provider secrets remain server-side.
