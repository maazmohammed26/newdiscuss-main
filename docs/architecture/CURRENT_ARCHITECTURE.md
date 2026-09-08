# Discuss Current Architecture Audit

Audit date: 2026-09-08  
Baseline commit: `61fdbe7`  
Restore tag: `pre-vnext-backend`

## Scope and method

This audit is based on the checked-in repository, route graph, dependency manifests, Firebase adapters, serverless handlers, Cloud Functions, service workers, Android project, and static reference searches. No production database was read or changed. Environment variable names were inventoried, but their values were not copied into this documentation.

## Repository topology

| Area | Purpose | Status |
|---|---|---|
| `frontend/` | Production Create React App client, Vercel API handlers, Capacitor Android wrapper | Active product |
| `functions/` | Firebase Cloud Functions for Telegram bot and email/maintenance workflows | Active backend |
| `Discuss Animation Studio/` | Separate Vite/TanStack Router animation utility | Separate application; not part of the Discuss client migration |
| root scripts | Broadcast and admin scripts | Operational/manual; must be reviewed before use |
| root `*_DATABASE_RULES.json` | RTDB rule snapshots for chat, groups, and stories | Present, but not wired by `firebase.json` |

The production client contains 221 JS/JSX/TS/TSX source files and approximately 46,995 lines: 36 page files, 130 component files, and 51 library files.

## Frontend runtime

- React 19 with React Router 7, Create React App/CRACO, Tailwind, Radix UI, and Framer Motion.
- `frontend/src/index.js` mounts the app and registers `/sw-push.js` at root scope.
- `frontend/src/App.js` owns lazy routes and global providers for authentication, audio calls, themes, highlights, security, confirmations, offline state, and onboarding.
- Firebase is the remote source of truth. The application initializes six named/default Firebase apps, all using Realtime Database; no active Firestore initialization was found.
- `idb` is already installed. Two separate IndexedDB databases currently exist: `discuss_offline` in `lib/db.js` and `discuss_cache` in `lib/cacheManager.js`.
- `localStorage` is used for fast copies of feed/chat/group data as well as settings, onboarding, bookmarks, editor drafts, notification preference state, and auth UI state.

## Current route surface

Public/static routes include landing, about, careers, blogs, contact, terms, privacy, support, download, search, guidelines, login, registration, verification, and the WebView login bridge.

Product routes include feed, post detail, user posts, profile, direct chat, group chat/info/join requests, Pulse, DevRadar, bookmarks, editor, AI assistant, TalentGraph, Sherlock, Tech News, and Tech Jobs. The PRD deprecates only Tech News and Tech Jobs. Existing public and product URLs outside those modules must remain stable.

## Current data flow

The codebase already has domain-oriented modules such as `db.js`, `commentsDb.js`, `relationshipsDb.js`, `chatsDb.js`, `groupsDb.js`, `storiesDb.js`, `pulseDb.js`, and `blinkService.js`. They are service modules rather than repository contracts, and UI code still imports Firebase directly in authentication, security, chat, group, profile, user-post, avatar, News, and Jobs code.

The Home feed path is the main scalability defect:

1. `getPosts()` downloads complete `posts`, `votes`, primary `comments`, and secondary `comments` trees.
2. `subscribeToPostsRealtime()` calls that full fetch and then attaches unbounded child listeners to complete `posts`, `votes`, and `comments` nodes.
3. The feed component receives and renders the combined in-memory list without a cursor contract.

Chat listeners are better bounded (`limitToLast`, default 50), although `getMessages` defaults to 1,000 and group history currently contains a `limitToLast(100000)` path. Pulse and DevRadar public-location listeners are unbounded.

## Backends and external services

- Seven Vercel handlers provide Android access reporting, audio-call tokens, LiveKit webhook handling, Gemini, NVIDIA, notification delivery, and support cases.
- Firebase Functions use Node 20 and Firebase Admin for Telegram bot/webhook, email, and maintenance behavior.
- Cloudinary is the active media path; an ImageKit-named wrapper also delegates to Cloudinary configuration.
- OneSignal Web SDK v16 is loaded through a dedicated scoped worker. Median/GoNative OneSignal calls are handled in the client notification service.
- Telegram has both server-side flows and legacy browser-side token paths.
- LiveKit supports audio calls.

## Deployment topology

Both Vercel and Netlify configuration exist. Each rewrites SPA routes and sets security/cache headers, but their CSP policies differ. Capacitor is configured with package `com.discuss.app`; the site also detects Median/GoNative wrappers and links to a Play Store package with a different identifier.

## Baseline verification

- `npm test -- --watchAll=false --runInBand`: 8 suites, 91 tests passed.
- `npm run build`: succeeded.
- Build warnings: two React hook warnings in `PulseFeed.jsx` and one in `SecurityLockScreen.js`.
- No physical Android or live push verification was performed by this repository audit.

## Highest-priority risks

1. Full-tree feed reads and unbounded listeners make startup cost grow with all production history.
2. Secret-bearing names such as OneSignal REST, Telegram bot, Discord bot, Brevo, AI, and private ImageKit keys are present in `REACT_APP_*` configuration and/or browser modules. Any populated `REACT_APP_*` value is public in a CRA bundle.
3. Broad RTDB rule snapshots grant every authenticated user database-wide write access in chat/group/story databases.
4. Two application workers plus two OneSignal worker URLs exist, increasing migration/conflict risk.
5. Native platform detection and bridge calls are duplicated instead of centralized.
6. Feed and local cache responsibilities are split between two IndexedDB databases plus localStorage copies.
7. Tech News and Tech Jobs remain routed, navigable, writable, and backed by unbounded listeners.

## Safety constraints for migration

All changes must be additive or compatibility-preserving until consumers are migrated. Firebase UIDs, node names, IDs, timestamps, media URLs/public IDs, and old fields remain authoritative. No bulk rewrite or production cleanup is part of the initial implementation.
