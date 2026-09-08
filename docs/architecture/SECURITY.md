# Discuss VNext Security

Last updated: 2026-09-08

All privileged credentials are server-only. Browser variables are limited to public Firebase/Cloudinary identifiers and upload preset. OneSignal REST, Telegram/Discord bot, Brevo, AI, LiveKit and Firebase Admin credentials must use the unprefixed names in `.env.example`.

Server endpoints enforce method, same-origin policy, Firebase bearer authentication, bounded inputs and safe public error messages. Notification and email routes add actor/recipient constraints and rate limiting. AI routes use fixed/allowlisted models, bounded messages and server-owned credentials. Admin notifications validate that the authenticated UID matches the reported actor and transactionally deduplicate events.

Auxiliary Firebase authentication mints short-lived per-project custom tokens from server-held service accounts, preserving the primary UID. Database rules and indexes must be staged using `FIREBASE_RULES_AND_INDEXES.md`; never replace live rules without exporting and testing the current policy.

No production database migration, deletion, service-worker unregister-all operation, credential value inspection, or remote deployment was performed. Rotate any secret that was historically exposed through a browser-prefixed variable or documentation before production release.
