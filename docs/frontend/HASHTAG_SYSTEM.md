# Discuss — Inline Hashtag Architecture & Discovery System

## Overview

Discuss features a zero-friction, native inline hashtag system designed for developer discovery, high-signal topic filtering, and offline-first persistence.

---

## 1. Syntax & Extraction Rules

- **Format**: `#tagname` (alphanumeric and underscores, 1 to 50 characters).
- **Prefix Boundary**: Must start at the beginning of a line or follow whitespace/non-word characters. Symbols like `C#` or `#` in currency are safely ignored.
- **Normalization**: All extracted tags are converted to lowercase.
- **Deduplication**: Case-insensitive (e.g., `#React`, `#REACT`, and `#react` resolve to `['react']`).
- **Index Ceiling**: Maximum **5 unique tags** are saved into the post payload for indexing (`post.hashtags`).
- **6th Tag Handling**: If more than 5 unique tags appear in the text, only the first 5 are indexed; a calm inline notice advises the author without blocking or throwing alert dialogs.

---

## 2. Local-First Caching & IndexedDB Schema

In `localDatabase.js`, the database version has been incremented to **v8** with an additive store:
```javascript
db.version(8).stores({
  hashtags: '&tag, count, lastUsedAt',
});
```
- **Primary key**: `tag` (lowercase string).
- **Index**: `count` (frequency count for ranking suggestions).
- **Index**: `lastUsedAt` (timestamp for recency weighting).

Whenever a post is created or edited, `recordHashtagsUsage(tags)` asynchronously updates the local frequency counts, ensuring autocomplete suggestions adapt to the user's workflow.

---

## 3. Real-Time Autocomplete Engine

The autocomplete engine (`hashtagService.js` and `HashtagAutocomplete.jsx`) runs during typing:
1. **Cursor Token Detection**: `getActiveHashtagToken(text, cursorPosition)` scans backwards from the cursor position to find `#` and isolates the query substring.
2. **Hybrid Candidate Selection**: Queries matching prefixes from:
   - Platform seed tags (`SEED_COMMUNITY_TAGS`: `react`, `nextjs`, `python`, `devops`, `pwa`, etc.)
   - Locally learned IndexedDB tags
3. **Selection**:
   - Keyboard: `ArrowDown`, `ArrowUp`, `Enter`, `Tab`, `Escape`.
   - Touch/Click: Tapping a pill replaces the token via `replaceHashtagToken(text, range, tag)` and appends a trailing space.

---

## 4. Clickable Hashtags & Search Deep Linking

In `LinkifiedText.js` and `PostCard.js`:
- Regex matches all inline hashtags within rendered post text.
- Each hashtag renders as an interactive, accessible link:
  - Default route: `/search?q=%23tag`
  - Optional prop: `onTagClick(tag)` for in-page filtering.
- Colors follow the Discuss brand palette (`text-[#0095F6] hover:underline font-medium`).
