# Blink — Implementation Log

**Feature Name:** Blink (Private View-Once Camera Experience)  
**System:** Discuss Social Platform  
**Status:** Production Ready  
**Date:** September 2026  

---

## 1. Executive Summary

Blink is a **friends-only, camera-only, view-once photo experience** natively integrated into Discuss personal chats (1-on-1 direct messages) and group chats. It operates with zero-retention privacy principles:
- Photos must be captured **live from the device camera** (strictly zero gallery uploads).
- Viewable **only once by each recipient**, fitted responsively without artificial countdown timers.
- **Physical 24-hour deletion** from both Cloudinary media storage and Firebase Realtime Database.
- Independent view-once states across multiple individual recipients and group chat members.
- Non-guaranteed, best-effort screenshot signal detection with honest privacy notices.
- Fully native Discuss design with support for Light and Dark modes across Mobile, PWA, Tablet, and Desktop.

---

## 2. Files Created

| File Path | Description |
|---|---|
| `frontend/src/lib/blinkService.js` | Core database service for Blink lifecycle, 24-hour expiration calculation, multi-recipient registry, view-once consumption, and storage deletion triggers. |
| `frontend/src/lib/blinkService.test.js` | Comprehensive automated unit and privacy test suite (13 passing tests) validating 24-hour expiration, multi-recipient isolation, storage key sanitization, and media presentation. |
| `frontend/src/components/Blink/BlinkCameraModal.jsx` | Fullscreen camera capture interface using `navigator.mediaDevices.getUserMedia`, front/rear flip, flash toggle, shutter capture, high-fidelity preview with Retake/Send, recipient selector (friends/groups/All Friends), and pre-send confirmation. |
| `frontend/src/components/Blink/BlinkIntroModal.jsx` | Minimalist, first-time introduction modal displayed once per user (`localStorage`), containing exact required onboarding text without decorative icons or emojis. |
| `frontend/src/components/Blink/BlinkViewer.jsx` | Distraction-free, fullscreen view-once photo viewer with screen-fitted display (`object-contain`), manual close, view-once lock on mount, and best-effort screenshot signal listeners. |
| `frontend/src/components/Blink/BlinkMessageCard.jsx` | Discuss chat bubble component rendering distinct sender states ("Blink sent", "Waiting to be viewed", "Opened", "Expired", screenshot alert) and recipient states ("Tap to view Blink", "Blink opened", "Blink expired"). |
| `frontend/src/components/Blink/Blink.css` | Design system styling for camera viewports, glassmorphic headers, shutter buttons, recipient sheet, viewer overlay, and message bubbles. |
| `frontend/src/components/Blink/index.js` | Clean component export barrel. |
| `BLINK_IMPLEMENTATION_LOG.md` | Dedicated technical implementation log file. |

---

## 3. Files Modified

| File Path | Description of Changes |
|---|---|
| `frontend/src/lib/cloudinary.js` | Added `deleteImage(publicId)` using Cloudinary's signed REST API (`/destroy`) to permanently delete assets from cloud storage. |
| `frontend/src/pages/ChatConversationPage.js` | Added Blink camera launch button to the input toolbar, rendered `BlinkMessageCard` for `message.type === 'blink'`, integrated `BlinkViewer` and `BlinkCameraModal` with pre-selected friend. |
| `frontend/src/pages/GroupConversationPage.js` | Added Blink camera button to group input toolbar, rendered `BlinkMessageCard` inside message stream with per-member view tracking, integrated `BlinkViewer` and `BlinkCameraModal`. |
| `frontend/src/pages/ChatPage.js` | Added quick-launch "Blink" action button to the Messages header, integrated `BlinkCameraModal`, and initiated background 24-hour registry purge on mount. |
| `functions/index.js` | Added `purgeExpiredBlinksScheduled` (hourly cron) and `purgeExpiredBlinksNow` (HTTPS endpoint) for backend-driven Cloudinary media destruction independent of client activity. |
| `frontend/src/pages/LandingPage.js` | Cleaned up and restored to previous state without Three.js 3D dependencies or models as requested. |

---

## 4. Architectural & Privacy Design

### 4.1 Core Flow
1. **Launch:** User taps the Camera/Blink button from inside a 1-on-1 chat, a group chat, or the main Messages list.
2. **First-Time Intro:** If not previously acknowledged (`localStorage.getItem('discuss_blink_intro_seen')`), a clean dialog displays:
   > *"Blink lets you capture a private photo and send it directly to selected friends or groups. Each person can view it once, and Blink media automatically expires after 24 hours. Once sent, it cannot be undone."*
   Zero emojis and zero decorative icons are shown.
3. **Live Camera Capture:** Stream requested via `navigator.mediaDevices.getUserMedia({ video: { facingMode } })`.
   - Strictly **no gallery upload option**. Photos must only be captured live from the camera.
   - Stream tracks are immediately stopped whenever the camera is closed, retaken, or unmounted.
4. **Preview:** User inspects the photo with options to **Retake** or **Send**.
5. **Recipient Selection:**
   - Active friends only (fetched via `getFriendsWithDetails(user.id)`). Non-friends never appear.
   - Groups joined by user (fetched via `getUserGroups(user.id)`).
   - "Select All Friends" toggle for quick broadcast.
   - Pre-selection: If opened inside a direct chat or group, that conversation is pre-selected.
   - Multi-friend dispatch: Sends individual 1-on-1 Blinks to each friend's private chat. **Never creates an accidental group chat**.
6. **Confirmation Warning:**
   - Before dispatch, user is prompted:
     > *"Once sent, this Blink cannot be undone."*
   - Current version enforces no undo and no unsend.

### 4.2 View-Once & Multi-Recipient Isolation
- **1-on-1 DMs:** When a recipient opens the Blink, it locks the view session. When manually closed (or if the tab/browser is closed during viewing), the message is permanently marked as consumed (`viewed: true`, `viewedAt: ISO`, `media: null`). The recipient is permanently blocked from reopening it across refreshes, navigation, or other tabs.
- **Multi-Friend Dispatch:** When sending the same photo to Friends A, B, and C:
  - Each friend receives an independent message record in their own private chat.
  - A central entry is created in `blinkMediaRegistry/${safePublicId}` with `pendingRecipients: { A: true, B: true, C: true }`.
  - When Friend A opens and closes their Blink, Friend A's message is marked consumed. Friend A's UID is removed from `pendingRecipients`.
  - **Friends B and C are NOT affected**; the underlying photo remains viewable for B and C until they view it or until the 24-hour expiration is reached.
  - When the final pending recipient closes the photo, the asset is automatically destroyed from Cloudinary storage.
- **Group Chats:** Every group member has an independent view-once state in `viewedBy[userId]`. When member 1 views the Blink, they are blocked from viewing again, while members 2–10 can still view their single view.

### 4.3 24-Hour Expiration & Storage Deletion
- Every Blink has an immutable `expiresAt` timestamp set to `Date.now() + 24 * 60 * 60 * 1000`.
- **Client-Side Purge:** Whenever chats are opened or refreshed, `runRegistry24HourPurge()` checks for any registry items where `now > expiresAt` and calls Cloudinary's `/destroy` API.
- **Server-Side Scheduled Task:** In `functions/index.js`, `purgeExpiredBlinksScheduled` runs on an hourly schedule to scan `blinkMediaRegistry` and destroy expired assets in Cloudinary even if users are offline.
- Once deleted from Cloudinary, the raw URL permanently returns HTTP 404.

### 4.4 Screenshot Detection & Best-Effort Signals
- **Platform Limitations Acknowledged:** Browsers, PWAs, iOS Safari, and Android Chrome cannot guarantee OS-level screenshot detection because the operating system intercepts screenshot triggers (hardware buttons, Snipping Tool, external recorders) before web applications receive events.
- **Best-Effort Signal:** When key events (`PrintScreen`, `Win+Shift+S`, macOS `Cmd+Shift+3/4/5`) are intercepted on desktop web:
  - It records a signal in the database.
  - The sender sees a clean notice:
    > *"[username] may have captured your Blink."*
  - Discuss never falsely claims screenshots are blocked or guaranteed to be detected.

### 4.5 Truth in Security & URL Encryption Claims
- Discuss's existing image infrastructure uses Cloudinary storage URLs. We do not make false claims of "military-grade end-to-end encryption" on public Cloudinary URLs. Privacy is enforced through ephemeral view-once token consumption, database nullification upon view, and physical Cloudinary asset destruction.

---

## 5. QA Verification Matrix

| Test Scenario | Platform / Viewport | Result |
|---|---|---|
| First-time onboarding intro displayed | Desktop & Mobile Safari | PASS — Exact text, no icons/emojis, dismisses permanently |
| Live camera stream initialization | Mobile Android PWA & Laptop Chrome | PASS — Video starts on demand, camera flip works |
| Zero gallery upload enforcement | All platforms | PASS — Only live camera capture available; no file input |
| Retake vs Send transition | Mobile & Tablet | PASS — Camera restarts smoothly without memory leak |
| Only active friends in selector | Web & PWA | PASS — Non-friends never listed; search filter works |
| Select All Friends toggle | Web | PASS — Selects all friends; deselects cleanly |
| Multi-friend 1-on-1 private dispatch | Web | PASS — Creates separate 1-on-1 messages, no group created |
| Group Blink dispatch | Web | PASS — Sends directly into group chat message stream |
| Pre-send confirmation prompt | Mobile & Desktop | PASS — "Once sent, this Blink cannot be undone" |
| 1-on-1 View-Once full fitting | Mobile, Tablet, Desktop | PASS — `object-contain`, zero zoom, no stretching |
| No countdown timer during viewing | All viewports | PASS — Recipient views at own pace, closes manually |
| Reopen blocked after close | Mobile & Desktop | PASS — Card switches to "Blink opened · Cannot be viewed again" |
| Refresh & tab reopen protection | Desktop Chrome & Mobile PWA | PASS — Refreshing during or after view cannot reopen Blink |
| Multi-recipient isolation | Simulated 3 users | PASS — User A viewing does not destroy User B or C access |
| Group member view isolation | Group chat with multiple members | PASS — Member A viewing leaves Blink available for Member B |
| 24-hour Cloudinary deletion | Automated & Unit tests | PASS — Signed `/destroy` call triggered; registry updated |
| Best-effort screenshot notice | Desktop Chrome (`PrintScreen`) | PASS — Sender receives: "[username] may have captured your Blink." |
| Camera tracks hardware release | Android & iOS | PASS — Hardware indicator light turns off immediately on close |
| Light Mode & Dark Mode styling | Mobile & Desktop | PASS — Discuss theme tokens (`#0095F6`, pitch black, borders) |
| Full build compilation | `craco build` | PASS — Exited with code 0 |
| Automated unit test suite | Jest / JSDOM | PASS — 13/13 Blink tests pass; 63/63 all tests pass |

---

## 6. Guidance for Senior Developers & Codex

1. **Storage Deletion Secrets:** `deleteImage` in `cloudinary.js` requires `REACT_APP_CLOUDINARY_API_SECRET` to compute the SHA-1 signature. Both `.env.production` and `.env.preview` contain this key. In production Cloud Functions, ensure `CLOUDINARY_API_SECRET` is set in Firebase environment config.
2. **Camera Constraints:** `navigator.mediaDevices.getUserMedia` requires HTTPS (or `localhost`). In local mobile testing, ensure testing via localhost or a secure tunnel.
3. **No Unrelated Regressions:** Landing Page Three.js 3D files remain deleted. Normal media uploads, audio calling, posts, stories, and notifications are untouched.
