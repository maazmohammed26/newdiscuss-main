# Discuss — Unified Composer Architecture (VNext)

## Overview

Discuss VNext introduces a unified, robust, multi-format composer supporting Discussions, Projects, and Pulses with native inline hashtag detection, progressive character count warnings, contextual action triggers, and strict zero-error reliability.

---

## 1. Pulse Crash Resolution & Lucide Icon Standardization

### Problem Solved
In production, opening `Create Post` and switching to the `Pulse` tab triggered an unhandled runtime error:
```text
ReferenceError: IoVideocam is not defined
```
This was caused by an unimported icon from `react-icons/io5` in the legacy composer layout. Furthermore, across multiple pages (`PulsePage`, `PulseFeed`, `MediaUpload`, `ChatConversationPage`, `FullscreenMedia`), mixed legacy icons from `react-icons/io` and `react-icons/io5` introduced bundle bloat and icon style inconsistencies.

### Architecture Fix
1. Standardized all icon imports strictly on the existing `lucide-react` family:
   - `<Video className="w-4 h-4 text-[#EF4444]" />` for video upload.
   - Replaced all legacy `Io` and `Io5` icons across `MediaUpload.jsx`, `PulseFeed.jsx`, `PulsePage.jsx`, `FullscreenMedia.jsx`, `ChatConversationPage.js`, and `GroupConversationPage.js`.
2. Verified zero occurrences of `react-icons/io` or `react-icons/io5` across the entire frontend codebase.
3. Automated regression test added in `CreatePostModal.pulse.test.js`.

---

## 2. Inline Hashtag Composer Architecture

### Removal of Separate Input Box
The separate hashtag input field (`[Add hashtags...]`) has been permanently removed in favor of natural inline hashtag writing:
- Users write `#react`, `#tailwindcss`, `#discuss` directly inside their post content or caption.
- Inline regex `(?:^|[^\w#])#([a-zA-Z0-9_]{1,50})(?=[^\w#]|$)` detects hashtags in real-time as users type.
- Hashtags are normalized to lowercase, deduplicated case-insensitively, and limited to a maximum of 5 indexed tags per post.
- If a user types 6 or more unique tags, a calm, inline feedback notice informs them: `"Maximum 5 hashtags will be indexed for search discovery."` without triggering jarring modal popups.

### Real-time Cursor Autocomplete
- When the cursor touches an active `#` token, `HashtagAutocomplete` anchors right next to the cursor or below the textarea.
- Suggestions are pulled from IndexedDB (`hashtags` store) and platform seed tags (`SEED_COMMUNITY_TAGS`).
- Keyboard navigation (Up/Down arrow, Enter/Tab to select, Escape to dismiss) and mouse selection are fully supported.
- Selected tags replace the active token and automatically append a trailing space for smooth continuous writing.

---

## 3. Character Limits & Grandfathered Legacy Editing

### New Post Validation
- Minimum length: **2 characters** (prevents empty or whitespace-only submissions).
- Maximum length: **600 characters** (enforces concise, readable technical discussions).
- Progressive counter colors:
  - 0–500 chars: Muted gray (`text-neutral-400 dark:text-neutral-500`)
  - 501–560 chars: Noticeable neutral (`text-neutral-700 dark:text-neutral-300`)
  - 561–590 chars: Warning amber (`text-amber-500`)
  - 591–600 chars: Strong warning red (`text-red-500 font-bold`)

### Grandfathered Legacy Editing Rule
- Existing historical posts created prior to the 600-character ceiling are not truncated or broken.
- In `EditPostModal.js`, the maximum allowed length is dynamically computed as:
  ```javascript
  const maxAllowedLength = Math.max(600, (post.content || '').length);
  ```
- If a grandfathered post has 1,200 characters, the author can edit within that 1,200 character ceiling.
- If the author trims the content to 500 characters and saves, any subsequent edits lock to the new 600 character platform ceiling.

---

## 4. Media Notice & Contextual Submissions

- Media Upload displays clear public notice: `"Uploaded media is public and visible to anyone viewing this post."`
- Submit buttons use context-sensitive labels:
  - Discussion: `Share Discussion`
  - Project: `Share Project`
  - Pulse: `Publish Pulse`
- Sound feedback (`playPublishSound()`) triggers smoothly upon successful creation.
