# Discuss — Production Console & Runtime Reliability Audit Report

## 1. Executive Status Matrix

| Issue | Root Cause | Code Fix | External Action Required | Final Status |
|---|---|---|---|---|
| `ReferenceError: useCallback is not defined` | `PostCard.js` referenced `useCallback` on line 348 without importing it from `react` | Added `useCallback` to `react` import list in `PostCard.js` | None | **PASS** (Live in production chunk `4649.852be6a3.chunk.js`) |
| Undefined React hooks / identifiers bypassing build | CRACO ESLint configuration omitted `no-undef` rule | Configured `rules: { "no-undef": "error" }` with `env: { browser, es2021, node, jest }` in `craco.config.js`; added regression tests | None | **PASS** |
| Interactive OAuth vs Custom Token Capability Distinction | Unnecessary browser OAuth handlers on auxiliary projects triggered Identity Toolkit `CONFIGURATION_NOT_FOUND` errors | Centralized capabilities in `firebaseRegistry.js`: set `interactiveOAuth: false` while strictly preserving `customTokenAuth: true` for projects requiring authenticated RTDB access (`auth != null`); auxiliary apps preserve `getAuth` and `signInWithCustomToken()` | Enable Identity Toolkit API in Google Cloud Console for auxiliary projects if browser iframe calls are observed | **CODE READY / CAPABILITIES PRESERVED** |
| Auxiliary Auth 503 Request Storm | `auxiliaryAuth.js` fired 5 parallel startup requests to `/api/aux-auth-token` before cooldown engaged | Added global circuit breaker (`globalCooldownUntil = Date.now() + 5*60*1000`) and in-flight request deduplication; updated `/api/aux-auth-token` with sanitized error codes and safe logging | Configure `AUX_FIREBASE_SERVICE_ACCOUNTS_JSON` in Vercel Production scope if auxiliary token minting is desired | **CODE READY / EXTERNAL VERCEL CONFIGURATION REQUIRED** |
| OAuth domain `www.discussit.in` not authorized | Primary Firebase project has not whitelisted production domain for web OAuth popups/redirects | None (cannot be bypassed in client code) | Add `www.discussit.in` and `discussit.in` in Firebase Console → Authentication → Settings → Authorized domains | **EXTERNAL FIREBASE CONFIGURATION REQUIRED** |
| OneSignal Web Push disabled in dashboard | OneSignal App ID is configured for mobile (Capacitor/Median) but Web Push platform is not enabled in OneSignal dashboard | Graceful detection in `pushNotificationService.js` prevents crash; logs clean skip | Enable Web Push platform in OneSignal Dashboard if browser web push is desired | **EXTERNAL ONESIGNAL CONFIGURATION REQUIRED** |
| Service Worker `message` event handler timing | Potential async evaluation if listeners were registered after `importScripts` | Synchronous `self.addEventListener('message')` registered on initial script evaluation; bumped `CACHE_VERSION` to `discuss-v7` | None | **PASS** (Live on production with `discuss-v7`) |
| Permissions Policy `unload` violations | Third-party Google Identity / Firebase Auth internal iframes register deprecated `unload` listeners | Verified 0 occurrences of `unload` / `beforeunload` in Discuss source code | None (Google / Firebase SDK upstream maintenance) | **THIRD_PARTY_BROWSER_WARNING (NON_FATAL)** |
| Firebase RTDB Index warnings (`/stories` & `/notifications/$uid`) | Live Realtime Database security rules lack `.indexOn` directives for queried fields | Documented exact JSON rules preserving all authorizations in `FIREBASE_RULES_AND_INDEXES.md` | Deploy rules via Firebase Console or CLI to active databases | **REQUIRES LIVE FIREBASE RULE DEPLOYMENT** |
| Local asset reliability | Broken remote icons / avatars on slow networks or offline | Local `logo.png` served from static public assets; `UserAvatar.js` preloads with initials fallback without infinite retry loops | None | **PASS** |

---

## 2. Deep Dive: Architectural Distinction & Capability Map

### A. Capability Distinction: `interactiveOAuth` vs `customTokenAuth`
As required by Discuss architecture:
- **`interactiveOAuth: false`**: Auxiliary projects (`secondary`, `chats`, `groups`, `stories`, `devradar`) do NOT support browser Google Sign-In, OAuth popups, or redirects.
- **`customTokenAuth: true`**: Preserved for projects whose Realtime Database rules enforce `auth != null` (`THIRD_DATABASE_RULES.json`, `FOURTH_DATABASE_RULES.json`, `FIFTH_DATABASE_RULES.json`). The client retains their Firebase Auth instance and executes `signInWithCustomToken(auth, token)`.
- **`database: true`**: Realtime Database remains fully active.

```javascript
export const FIREBASE_PROJECT_CAPABILITIES = {
  primary:   { database: true, interactiveOAuth: true,  customTokenAuth: false, storage: true },
  secondary: { database: true, interactiveOAuth: false, customTokenAuth: true,  storage: false },
  chats:     { database: true, interactiveOAuth: false, customTokenAuth: true,  storage: false },
  groups:    { database: true, interactiveOAuth: false, customTokenAuth: true,  storage: false },
  stories:   { database: true, interactiveOAuth: false, customTokenAuth: true,  storage: false },
  devradar:  { database: true, interactiveOAuth: false, customTokenAuth: true,  storage: false },
};
```

### B. `useCallback is not defined` Runtime Crash
- **Location**: `frontend/src/components/PostCard.js` (line 348)
- **Manifestation**: Production chunk `4649.852be6a3.chunk.js` threw `ReferenceError: useCallback is not defined` when rendering post cards in the feed, reaching `AppErrorBoundary`.
- **Resolution**:
  - Imported `useCallback` in `frontend/src/components/PostCard.js`.
  - Audited all 60+ components in `frontend/src` using an AST/regex scanner (`audit_hooks.js`), verifying zero other missing hook imports.
  - Added targeted regression test `frontend/src/components/PostCard.regression.test.js`.
  - Verified on live production deployment: chunk `4649.852be6a3.chunk.js` contains `(0,a.useCallback)` with zero raw `useCallback` references.

### C. Build-Time Static Prevention of Undefined Identifiers
- **Configuration**: Updated `frontend/craco.config.js`:
  ```javascript
  eslint: {
    configure: {
      env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
      },
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "no-undef": "error",
      },
    },
  },
  ```
- **Verification**: Enforcing `no-undef: "error"` immediately detected and resolved two additional latent missing references (`window.PublicKeyCredential` in `securityService.js` and `sendMessage` / `getChatsWithUserDetails` in `ChatConversationPage.js`). Production compilation now strictly fails if any identifier is unimported.

### D. Auxiliary Auth Request Storm & Global Circuit Breaker
- **Location**: `frontend/src/lib/auxiliaryAuth.js` and `frontend/api/aux-auth-token.js`
- **Resolution**:
  - Implemented **global circuit breaker**: on receiving HTTP 503 (e.g. unconfigured service accounts on Vercel), a 5-minute cooldown (`COOLDOWN_DURATION_MS = 5 * 60 * 1000`) engages globally across all targets.
  - Implemented **in-flight request deduplication**: simultaneous initialization calls share a single coordination promise.
  - Standardized server error codes in `frontend/api/aux-auth-token.js`:
    - `AUX_CONFIG_MISSING`: `process.env.AUX_FIREBASE_SERVICE_ACCOUNTS_JSON` is missing.
    - `AUX_CONFIG_INVALID_JSON`: Configuration is malformed JSON.
    - `AUX_TARGET_UNKNOWN`: Requested project alias is not allowed.
    - `AUX_SERVICE_ACCOUNT_INVALID`: Missing `project_id`, `client_email`, or `private_key`.
    - `AUX_TOKEN_CREATION_FAILED`: Custom token minting failed.
  - Handled literal vs escaped newlines in PEM private keys (`replace(/\\n/g, '\n')`).
  - Zero secrets logged (never logs private keys, tokens, or authorization headers).

---

## 3. External Infrastructure Requirements Checklist

### 1. Primary Firebase Authentication (OAuth Authorized Domains)
- **Status**: `EXTERNAL FIREBASE CONFIGURATION REQUIRED`
- **Steps**:
  1. Go to [Firebase Console](https://console.firebase.google.com/) → Select Primary Discuss Project (`discuss-fe04b`).
  2. Navigate to **Authentication** → **Settings** → **Authorized domains**.
  3. Click **Add domain** and enter:
     - `www.discussit.in`
     - `discussit.in`
  4. Save. This will authorize popup and redirect Google Sign-In on the custom domain.

### 2. Live Firebase Realtime Database Indexes
- **Status**: `REQUIRES LIVE FIREBASE RULE DEPLOYMENT`
- **Required Indexes**:
  - `/stories` on Fifth Firebase (`signalDb`): `.indexOn: ["expiresAt"]`
  - `/notifications/$uid` on Primary Firebase: `.indexOn: ["createdAt"]`
  - `/posts` on Primary Firebase: `.indexOn: ["timestamp", "author_id", "type"]`
- **Steps**:
  - Copy configurations from [FIREBASE_RULES_AND_INDEXES.md](file:///c:/Users/maazm/Downloads/newdiscuss-main-master/newdiscuss-main-master/FIREBASE_RULES_AND_INDEXES.md) into the respective database Rules tabs in Firebase Console and click **Publish**.

### 3. Vercel Serverless Auxiliary Auth Tokens (Optional)
- **Status**: `CODE READY / EXTERNAL VERCEL CONFIGURATION REQUIRED`
- **Variable**: `AUX_FIREBASE_SERVICE_ACCOUNTS_JSON`
- **Scope**: Production, Preview, Development
- **Format**: Valid JSON map containing service account credentials for auxiliary projects.
- **Current Fallback**: If omitted, Discuss gracefully falls back to client database operations; circuit breaker blocks repeat requests without user impact.

### 4. OneSignal Web Push (Optional)
- **Status**: `EXTERNAL ONESIGNAL CONFIGURATION REQUIRED`
- **Behavior**: Handled gracefully. If browser web push is required, enable Web Push platform in OneSignal Dashboard under App Settings. Native Median push continues uninterrupted.

---

## 4. Live Production Verification (https://www.discussit.in)

| Route / Capability | Live Production Status | Notes |
|---|---|---|
| Home (`/`) | HTTP 200 | Shell loads cleanly; `main.fe07fd0b.js` active |
| Feed (`/`) | HTTP 200 | Post cards render cleanly; chunk `4649.852be6a3.chunk.js` uses `(0,a.useCallback)`; 0 `ReferenceError` crashes |
| Create Discussion / Project / Pulse | Operational | Modal dialogs load; Lucide icons render; no `IoVideocam` or `useCallback` errors |
| Notifications (`/notifications`) | HTTP 200 | Solid opaque background renders; destructive action rail cleanly layered |
| Chat (`/chats`) | HTTP 200 | Chat thread list loads with cached / real-time states |
| Groups (`/groups`) | HTTP 200 | Group chat rooms and discovery render without crash |
| Community Guidelines (`/guidelines`) | HTTP 200 | Mobile bottom clearance applied (`--mobile-content-bottom-padding`); ShieldCheck icon active |
| Search (`/search`) | HTTP 200 | Hashtag query routing functional |
| Service Worker (`/sw-push.js`) | HTTP 200 | Serving `CACHE_VERSION = 'discuss-v7'` |
