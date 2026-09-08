# Discuss — Pulse Regression, Swipe Layering & Mobile Guidelines Audit Report

## 1. Executive Summary

| Issue | Severity | Status | Verification Mechanism |
|---|---|---|---|
| Pulse `IoVideocam is not defined` crash | Critical (Crash) | Resolved | Automated test + browser audit |
| Mixed legacy icon families (`react-icons/io`) | Medium (Architecture) | Resolved | Codebase grep audit (0 remaining) |
| Notification swipe destructive red bleed-through | High (Visual defect) | Resolved | Opaque background + rear rail architecture |
| Community Guidelines mobile bottom clipping | High (Layout defect) | Resolved | Design system token `--mobile-content-bottom-padding` |
| Community Guidelines decorative star/sparkle icon | Low (Design standard) | Resolved | Replaced with semantic `ShieldCheck` |

---

## 2. Root Cause Analysis

### Issue A: Pulse `IoVideocam` Crash
- **Location**: `frontend/src/components/CreatePostModal.js`
- **Cause**: Line 250 referenced `<IoVideocam className="..." />`, but the import was missing and the library was from `react-icons/io5` rather than Discuss standard `lucide-react`.
- **Fix**: Replaced with Lucide `<Video className="w-4 h-4 text-[#EF4444]" />`. Automated test added in `CreatePostModal.pulse.test.js`.

### Issue B: Notification Swipe Layering
- **Location**: `frontend/src/components/NotificationItem.js`
- **Cause**: The foreground row used `bg-blue-50/70` and `dark:bg-blue-950/20` (semi-transparent alpha channel). The underlying absolute delete action container (`bg-rose-600`) bled through the right 96px of unread notifications, giving the appearance that the red action overlayed the timestamp and mark read buttons.
- **Fix**:
  1. Updated foreground to solid, opaque backgrounds: `bg-[#EEF6FF] dark:bg-[#0D1E36]` (unread) and `bg-white dark:bg-neutral-950` (read).
  2. Maintained red destructive rail strictly behind foreground row (`z-0` vs `z-10`).
  3. Added `dragDirectionLock={true}` to prevent vertical page scroll conflicts.
  4. Restricted rail width to 88px with spring settle mechanics.
  5. Kept accessible in-row Mark read and Delete buttons with ARIA labels.

### Issue C: Community Guidelines Mobile Scroll
- **Location**: `frontend/src/pages/InAppGuidelinesPage.js` & `frontend/src/index.css`
- **Cause**: Mobile viewport had fixed `FloatingNavbar` (`h-[49px] + safe-area-inset-bottom`), but Guidelines `<main>` only had `py-6 sm:py-10`. On mobile/tablet, the final black section was partially covered by the navigation bar.
- **Fix**:
  1. Created central spacing tokens in `index.css`: `--bottom-nav-height: 49px; --mobile-content-bottom-padding: calc(49px + env(safe-area-inset-bottom, 0px) + 2rem);`.
  2. Applied clearance to `InAppGuidelinesPage` and `NotificationsPage`: `pb-[calc(var(--bottom-nav-height,49px)+env(safe-area-inset-bottom,0px)+2rem)] sm:pb-12 lg:pb-12`.
  3. Replaced decorative `Sparkles` icon with semantic `ShieldCheck` icon.
  4. Desktop (`lg:pb-12`) preserved with zero excessive padding or layout shift.

---

## 3. Test Suite Status

- Total test suites: **25 passed, 25 total** (0 failed).
- Total tests: **160 passed, 160 total** (0 failed).
