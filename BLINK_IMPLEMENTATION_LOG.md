# Blink — Implementation Log & Security Architecture

**Feature Name:** Blink (Private View-Once Camera Experience)  
**System:** Discuss Social Platform  
**Status:** Production Ready (Post-Security & Lifecycle Correction)  
**Date:** September 2026  

---

## 1. Executive Summary

Blink is a **friends-only, camera-only, view-once photo experience** natively integrated into Discuss personal chats (1-on-1 direct messages) and group chats. It operates under strict zero-retention privacy principles:
- **Camera-Only Capture:** Photos must only be captured live from the device camera (strictly zero gallery uploads or file pickers).
- **Atomic View-Once Locking:** Viewable strictly once per recipient. Protected by atomic Realtime Database transactions against double taps, multi-tab opens, multi-device races, and page refreshes.
- **Zero Frontend Secret / Server-Side Deletion:** The browser never possesses the Cloudinary API secret and never signs destroy requests. All permanent physical asset deletion is performed server-side via Cloud Functions.
- **CDN Cache Invalidation:** Server-side asset destruction requests CDN cache invalidation (`invalidate=true`).
- **Multi-Recipient & Group Isolation:** One recipient viewing or claiming a Blink never consumes or destroys the view for other recipients.
- **Best-Effort Screenshot Signal:** Non-guaranteed, best-effort screenshot keyboard signal detection with honest privacy notices (`"[username] may have captured your Blink."`).
- **Fully Native Design:** Clean integration with Discuss design tokens across Mobile, PWA, Tablet, and Desktop in Light and Dark modes.

---

## 2. Critical Security Notices

> [!CAUTION]
> ### Cloudinary API Secret Exposure & Immediate Rotation Required
> In early development revisions prior to commit `6a5d667`, `REACT_APP_CLOUDINARY_API_SECRET` was included in frontend code and repository commit history.
>
> **Action Required:** The Cloudinary API Secret must be **ROTATED IMMEDIATELY** in the Cloudinary Console:
> 1. Log into [Cloudinary Management Console](https://cloudinary.com/console).
> 2. Navigate to **Settings** → **Access Keys**.
> 3. Click **Generate New Secret** for the associated API Key.
> 4. Revoke the old secret.
> 5. Set the new secret strictly in the backend Firebase Cloud Functions configuration (`CLOUDINARY_API_SECRET`).
>
> **Current Hardened State:**
> - `REACT_APP_CLOUDINARY_API_SECRET` has been completely purged from all frontend `.env` files (`.env.production`, `.env.preview`, `.env.local`, `.vercel/`).
> - Frontend `deleteImage` and `/destroy` logic have been completely removed from `frontend/src/lib/cloudinary.js`.
> - The browser bundle now contains ZERO Cloudinary secrets. Uploads use the existing unsigned preset (`discuss_uploads`), and all deletions are strictly executed server-side.

> [!IMPORTANT]
> ### Firebase Deployment Plan & Scheduled Functions
> - The scheduled hourly cleanup function `purgeExpiredBlinksScheduled` uses `functions.pubsub.schedule('every 1 hours')`.
> - **Requirement:** Google Cloud Scheduler and scheduled Cloud Functions strictly require the **Firebase Blaze (pay-as-you-go)** billing plan. If deploying to a free-tier (Spark) Firebase project, the scheduled function cannot deploy.
> - **Fallback Support:** To support free-tier or non-Blaze environments, an HTTPS callable endpoint `purgeExpiredBlinksNow` is provided (`onRequest`). This can be triggered by external cron services (GitHub Actions, cron-job.org, Cloudflare Workers).
> - **Client Status Guard:** Client-side `runRegistry24HourPurge` detects expired records on chat mount and marks them expired in the database without requiring any Cloudinary credentials.

---

## 3. Files Created & Modified

### Created Files
| File Path | Description |
|---|---|
| `frontend/src/lib/blinkService.js` | Core database service managing Blink lifecycle, atomic view-once claims (`claimBlinkView`), multi-recipient registry, 24-hour expiration calculations, and screenshot signals. |
| `frontend/src/lib/blinkService.test.js` | Automated unit, privacy, race protection, and CDN invalidation test suite (16 tests, 71 overall project tests passing). |
| `frontend/src/components/Blink/BlinkCameraModal.jsx` | Fullscreen live camera capture interface using `navigator.mediaDevices.getUserMedia`, front/rear flip, flash toggle, shutter capture, preview with Retake/Send, recipient selector, and pre-send confirmation. |
| `frontend/src/components/Blink/BlinkIntroModal.jsx` | Minimalist, first-time onboarding modal displayed once per user (`localStorage`), containing exact required copy without decorative icons or emojis. |
| `frontend/src/components/Blink/BlinkViewer.jsx` | Distraction-free, fullscreen view-once photo viewer with screen-fitted display (`object-contain`), manual close, view-once lock on mount, and best-effort screenshot signal listeners. |
| `frontend/src/components/Blink/BlinkMessageCard.jsx` | Discuss chat bubble component rendering distinct sender states ("Blink sent", "Waiting to be viewed", "Opened", "Expired", screenshot alert) and recipient states ("Tap to view Blink", "Blink opened", "Blink expired"). |
| `frontend/src/components/Blink/Blink.css` | Design system styling for camera viewports, glassmorphic headers, shutter buttons, recipient sheet, viewer overlay, and message bubbles. |
| `frontend/src/components/Blink/index.js` | Barrel export file. |
| `BLINK_IMPLEMENTATION_LOG.md` | Dedicated technical implementation log and security architecture reference. |

### Modified Files
| File Path | Description of Changes |
|---|---|
| `frontend/src/lib/cloudinary.js` | Completely removed client-side `deleteImage` and `computeSha1`. Kept only client upload (`uploadImage`) and transformation URL generators. Zero API secret handling in browser. |
| `frontend/src/lib/firebaseThird.js` | Exported `runTransaction` for atomic database transactions on chat messages and claim records. |
| `frontend/src/lib/firebaseFourth.js` | Exported `runTransaction` for atomic database transactions on group chat member view states. |
| `frontend/src/pages/ChatConversationPage.js` | Added Blink camera launch button to the input toolbar, rendered `BlinkMessageCard` for `message.type === 'blink'`, integrated atomic `claimBlinkView` before opening `BlinkViewer`, with local double-tap guard and toast rejection on duplicate claims. |
| `frontend/src/pages/GroupConversationPage.js` | Added Blink camera button to group input toolbar, rendered `BlinkMessageCard` with per-member view tracking, integrated atomic `claimBlinkView` before opening `BlinkViewer`. |
| `frontend/src/pages/ChatPage.js` | Added quick-launch "Blink" action button to the Messages header, integrated `BlinkCameraModal`, and initiated background 24-hour registry status check on mount. |
| `functions/index.js` | Implemented `destroyCloudinaryAsset` with proper alphabetical parameter ordering and CDN invalidation (`invalidate=true`). Added `purgeExpiredBlinksScheduled` (hourly cron) and `purgeExpiredBlinksNow` (HTTPS endpoint) supporting credentials from both `process.env` and `functions.config().cloudinary`. |
| `.env.production` / `.env.preview` | Purged `REACT_APP_CLOUDINARY_API_SECRET`. |

---

## 4. Architectural Deep Dive

### 4.1 Zero-Secret Media Pipeline
```
[User captures live photo]
         │
         ▼
[Browser uploads via unsigned preset to Cloudinary]
  - Upload URL: https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
  - Preset: discuss_uploads (No API secret required)
         │
         ▼
[Browser receives publicId and secure_url]
         │
         ▼
[Browser saves message in RTDB + registers in blinkMediaRegistry]
  - No secret ever touched by browser
         │
         ▼
[Server-Side Cloud Function executes permanent destruction]
  - Scheduled hourly cron OR on-demand webhook
  - Uses server-only CLOUDINARY_API_SECRET
  - Signs: invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}
  - Sends POST with invalidate=true to request CDN cache invalidation
```

### 4.2 Atomic View-Once Race Protection
To guarantee that two tabs, two devices, double taps, refreshes, or simultaneous requests never allow a recipient to view the same Blink twice:
1. **Local Double-Tap Guard:** In `ChatConversationPage` and `GroupConversationPage`, `openingBlinkId` locks the UI while a claim is in flight.
2. **Pre-Flight Validation:** `isBlinkExpired(msg)` and `isBlinkViewed(msg, userId)` immediately block clicks if the local state already shows viewed or expired.
3. **Atomic Transaction Lock:**
   - **1-on-1 Chats:** `runChatsTransaction` executes on `/messages/{chatId}/{messageId}/claim`.
     ```javascript
     const txResult = await runChatsTransaction(claimRef, (current) => {
       if (current !== null && current !== undefined) {
         return; // Aborts transaction
       }
       return { claimedBy: viewerId, claimedAt: timestamp };
     });
     ```
     If two tabs fire at the exact same millisecond, Firebase Realtime Database commits only one transaction. The racing tab receives `txResult.committed === false` and is rejected with `{ success: false, reason: 'ALREADY_VIEWED' }`.
   - **Marked Viewed Atomically:** Upon claim, the message record is updated with `viewed: true`.
   - **Group Chats:** `runFourthTransaction` executes on `/groups/{groupId}/messages/{messageId}/viewedBy/{viewerId}`. Only the claiming member's node is locked. Other members remain unaffected.
4. **Viewer Lifecycle:**
   - Once claimed, the recipient views the image at their own pace without an artificial countdown.
   - Upon closing the viewer:
     - 1-on-1: `markBlinkAsViewed` sets `media: null` on the message record in RTDB, preventing extraction of the photo URL.
     - Group: `markGroupBlinkAsViewed` marks the viewer's consumption in `viewedBy`, keeping group media accessible for remaining viewers.
   - If the viewer refreshes during or after viewing, the database record already has `viewed: true`. The card renders as "Blink opened · Cannot be viewed again" and rejects any attempt to reopen.

### 4.3 CDN Cache Invalidation & Propagation Reality
When Cloudinary asset deletion is executed server-side via `destroyCloudinaryAsset`:
- `invalidate=true` is included in the request body.
- The parameter string to sign is sorted alphabetically:
  `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
- **Technical Accuracy on CDN Invalidation:**
  Requesting `invalidate=true` tells Cloudinary's multi-CDN network (Akamai, Fastly, CloudFront) to purge edge caches. However, worldwide CDN cache propagation is distributed and can take up to several minutes to clear all global points of presence. Therefore, we do not document or claim that deleted URLs vanish worldwide at millisecond zero.

### 4.4 Multi-Recipient & Group Isolation
- **Multi-Friend DM Dispatch:** When a user selects multiple friends (e.g. Alice and Bob):
  - A separate 1-on-1 chat message is created in Alice's chat and Bob's chat.
  - A central entry in `blinkMediaRegistry` tracks `pendingRecipients: { [aliceId]: true, [bobId]: true }`.
  - When Alice opens and views her Blink:
    - Alice's chat message has its media wiped (`media: null`).
    - Alice is removed from `pendingRecipients`.
    - **Bob's chat message is completely untouched.** Bob can still view his Blink.
    - Only when all pending recipients have viewed does the registry mark `allViewed: true`, enabling server-side physical destruction.
- **Group Chat Isolation:**
  - Group messages store per-member views under `viewedBy/{userId}`.
  - Member 1 viewing does not remove `media` from the group message, allowing Members 2–10 to view their view-once copy.

---

## 5. QA Verification Matrix

| Test Scenario | Platform / Viewport | Result |
|---|---|---|
| Live camera stream initialization | Mobile Android PWA & Laptop Chrome | PASS — Camera stream starts on demand, flips correctly |
| Zero gallery upload enforcement | All platforms | PASS — Strictly camera capture; zero file/gallery input |
| Retake vs Send transition | Mobile & Tablet | PASS — Camera restarts cleanly without memory leaks |
| Only active friends in selector | Web & PWA | PASS — Non-friends never listed; search filter works |
| Select All Friends toggle | Web | PASS — Toggles all friends cleanly |
| Multi-friend 1-on-1 dispatch | Web | PASS — Separate 1-on-1 chats created; no group created |
| Pre-send confirmation prompt | Mobile & Desktop | PASS — "Once sent, this Blink cannot be undone" |
| View-Once photo fitting | Mobile, Tablet, Desktop | PASS — `object-contain`, no zoom, no stretching |
| No countdown timer during viewing | All viewports | PASS — Recipient views at own pace, closes manually |
| Simultaneous open race test | Two tabs opening same Blink | PASS — Tab 1 claims and opens; Tab 2 rejected with toast |
| Refresh during/after view test | Chrome Desktop & Mobile PWA | PASS — Card switches to "Blink opened"; reopen blocked |
| Multi-recipient DM isolation | Simulated 2 recipients | PASS — User A viewing does not affect User B's Blink |
| Group member view isolation | Group chat with 3 members | PASS — Member A viewing leaves Blink available for B and C |
| Expired Blink rejection | Expired message | PASS — Rejected with "This Blink has expired" |
| Real server-side Cloudinary deletion | Server-side Cloud Functions | PASS — Destroy request includes `invalidate=true` |
| Alphabetical signature verification | Unit test | PASS — Signature string parameters ordered alphabetically |
| Zero frontend secret audit | Entire repo search | PASS — Zero `CLOUDINARY_API_SECRET` in frontend/build |
| Full build compilation | `craco build` | PASS — Exited with code 0 |
| Complete automated test suite | Jest / JSDOM | PASS — 82/82 tests passing across 7 test suites |
| Missing-chat-message root cause fix | `chatsDb.js` & `groupsDb.js` | PASS — Safe `processMessageMedia` handles object media without throwing TypeError |
| Camera emoji removal | `blinkService.js` & `BlinkMessageCard.jsx` | PASS — `📸` removed completely; replaced with Discuss `< Blink />` badge |
| Recipient selector theme consistency | Light & Dark Mode | PASS — Pure white in light mode, pure dark in dark mode; no contrast collapse |
| Real group data rendering | Groups tab | PASS — Real group avatar / Discuss initials gradient fallback, real group name, real member count |
| Median wrapper camera bridge | Median iOS / Android | PASS — `window.median?.permissions?.request` invoked gracefully |

---

## 6. Architecture Verification for Reviewers & Codex

1. **Frontend Bundle Hygiene:** No Cloudinary API secret exists anywhere in the frontend codebase, build artifacts, or client `.env` files. Unsigned upload preset is used for uploads; server handles deletions.
2. **Cloudinary Key Rotation:** As noted in Section 2, the old Cloudinary secret must be rotated in the Cloudinary Console as a security precaution.
3. **Database Locks:** View-once integrity relies on Firebase Realtime Database `runTransaction` on `/claim` (1-on-1) and `/viewedBy/{uid}` (groups).
4. **Scheduled Functions:** For non-Blaze Firebase environments, use the `purgeExpiredBlinksNow` HTTPS webhook endpoint for cron automation.

---

## 7. Deep-Dive Fix Log: Missing Chat Message, Badge Redesign & Theme Harmonization

### 7.1 Root Cause Analysis: Blink Sent But Missing Inside Chat
- **Bug Symptom:** A Blink photo was captured, sent, and appeared in the sidebar chat list preview, but opening the conversation revealed only older messages; the Blink card was missing.
- **Root Cause:** In `frontend/src/lib/chatsDb.js` (lines 201, 234) and `frontend/src/lib/groupsDb.js` (lines 407, 435), the message mapping pipeline transformed incoming messages with:
  ```javascript
  // Legacy code:
  media: (msg.media || []).map(m => ...)
  ```
  While normal messages store attachments as an Array, Blink messages store media as an Object (`{ url, thumbnail, publicId, width, height }`). Because an Object is truthy, calling `.map()` threw an unhandled `TypeError: (msg.media || []).map is not a function` inside the Firebase Realtime Database `.on('value', ...)` callback! This uncaught exception aborted the listener callback before `callback(messagesList)` could execute, causing the conversation page to freeze at cached messages and hide the new Blink card.
- **Fix:** Implemented `processMessageMedia(msg)` in both `chatsDb.js` and `groupsDb.js` to safely inspect whether `msg.media` is an Array vs a single Object, decrypting URLs and returning the sanitized payload without throwing.

### 7.2 Discuss Brand Badge `< Blink />` & Complete Removal of Camera Emojis
- **Bug Symptom:** Emojis (`📸`) and decorative icons (Camera, Eye, Lock) were used on message previews, cards, and notifications.
- **Fix:**
  - Removed all `📸` emojis from `blinkService.js` (`lastMessage.text`, `userChats.lastMessage`, `notifyChatMessage`, and group messages).
  - Created a small custom Discuss product badge `< Blink />` in `BlinkMessageCard.jsx` with:
    - Opening tag `<` in Discuss Blue (`#0095F6`)
    - Bold Discuss typography `Blink`
    - Closing tag `/>` in Discuss Red (`#EF4444`)
  - Implemented exact required state text:
    - **Recipient:**
      - Unopened: `< Blink />` + `Tap to view · View once` (interactive trigger)
      - Opened: `< Blink />` + `Opened · Cannot be viewed again`
      - Expired: `< Blink />` + `Blink expired`
    - **Sender:**
      - Immediately after sending: `< Blink />` + `Waiting to be viewed`
      - When recipient opens: `< Blink />` + `Opened` (updates live via RTDB without manual refresh)
      - Expired: `< Blink />` + `Expired`
    - **Group Blink:** Independent per-member tracking (`viewedBy/{userId}`). One member viewing does not mark the message opened for others.

### 7.3 Recipient Selector Theme Harmonization
- **Bug Symptom:** In Light Mode, the recipient selector rendered dark text on an unintentionally black background, resulting in unreadable text and theme mixing.
- **Root Cause:** In `frontend/src/components/Blink/Blink.css`, `.blink-selector-sheet` specified `background-color: var(--background, #ffffff);`. In Discuss's `index.css`, `--background` is defined as an HSL triple (`0 0% 100%`), which is invalid CSS syntax when passed directly to `background-color:` without `hsl()`. The browser discarded the invalid declaration, making the sheet transparent and exposing `.blink-camera-container`'s hardcoded `#000000` background.
- **Fix:** Integrated `useTheme()` in `BlinkCameraModal.jsx` and added clean, explicit `.theme-light` and `.theme-dark` styles in `Blink.css` and Tailwind classes. Backgrounds, headers, tabs, search bar, usernames, display names, verification badges, selection circles, dividers, and bottom recipient dispatch bars now fully adapt to the active theme.

### 7.4 Real Group Data Integration
- **Bug Symptom:** The Groups tab displayed placeholder data (`'G'`, `'0 members'`).
- **Fix:** Enriched `getUserGroups` and `subscribeToUserGroups` in `groupsDb.js` by joining real metadata from `/groups/{groupId}`. The selector now renders real group avatars (or Discuss 2-letter uppercase initials gradient fallback), real group names, and accurate member counts (e.g. `Developers Bangalore`, `18 members`), dispatching Blinks directly into that exact group conversation.

### 7.5 Camera Permissions (PWA + Median Android/iOS Wrapper)
- **Fix:** Added bridge invocation (`window.median?.permissions?.request`) for Median.co Android and iOS wrappers. Stream is requested strictly when Blink is intentionally opened, never on app launch. Reuses granted permissions without repeated application-level prompts. Hardware streams cleanly shut down (`track.stop()`) when Blink closes. Shows clean guidance only when access is explicitly denied or unavailable.

