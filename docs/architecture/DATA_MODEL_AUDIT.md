# Discuss Data Model Audit

Audit date: 2026-09-08

## Remote databases

Discuss currently partitions Realtime Database data across six Firebase applications. Firebase Authentication is initialized only on the primary app; secondary apps rely on the same UID as an application-level identity convention. Cross-project RTDB authorization must be verified because a primary auth session is not automatically proof of authentication to every separately initialized Firebase project.

| Firebase app | Observed logical nodes | Main consumers |
|---|---|---|
| Primary/default (`discuss-13fbc`) | `users`, `userEmails`, `usernames`, `posts`, `votes`, legacy `comments`, `admin_settings`, `pendingVerifications`, `webViewAuth`; nested `users/{uid}/talentGraph` and notification/Telegram fields | auth, profiles, feed/posts, legacy comments, AI/TalentGraph, admin state, WebView auth bridge |
| Secondary (`discussit-5879b`) | `userProfiles`, `comments`, `replies`, `commentBadges`, `replyBadges`, `relationships`, `userSecurity`, `adminMessage` | profile extensions, new comments/replies, relationships, security settings, admin banner |
| Third/chat (`discuss-f1f56`) | `chats`, `messages`, `userChats`, `deletedMessages`, `reports`, `blinkMediaRegistry` | direct messages, unread metadata, deletion state, reports, Blink DM registry |
| Fourth/groups (`discuss-3c060`) | `groups`, nested members/messages/joinRequests/invites, `groupNames`, `userGroups`, `userGroupInvites`, `deletedGroupMessages` | group membership, group messages, invites, join requests |
| Fifth/signals (`discuss-d48be`) | `stories`, `storyViews`, `userSeenStories`, `pulse`, `pulseLikes` | 24-hour stories and Pulse |
| Sixth/DevRadar (`discuss-74b96`) | `devRadarLocations`, `techNews`, `jobs` | DevRadar plus the two deprecated product modules |

The exact production schemas are schemaless and compatibility-sensitive. The tables above record paths referenced in source; they are not authorization to delete or rename any node.

## Entity shapes observed

### Users and profiles

Primary users contain identity and display data and may also contain OneSignal IDs, Telegram IDs/preferences, notification preview state, presence, verification state, and nested TalentGraph data. Secondary `userProfiles` carries extended profile data. Reads frequently merge data from these locations at the UI/service layer.

### Posts

Posts use pushed Firebase keys and preserve author UID/name/photo/verification snapshots, ISO timestamp, type, title/content, media array, links, hashtags, and optional code. Votes are stored separately at `votes/{postId}/{uid}`. Comments exist in both primary and secondary databases; current feed counts merge both trees.

### Direct messages and Blink

Chat metadata is stored under `chats` and per-user summaries under `userChats`. Message IDs are currently Firebase push keys. Message media, reply, forward, deletion, delivery/read, and Blink fields are embedded in message records. Blink adds a third-database media registry and claim/view state; group Blink stores per-viewer state under group messages.

### Groups

Group records embed members, messages, join requests, and invitations, with denormalized per-user summaries in `userGroups` and `userGroupInvites`. Permission checks occur in the browser service before writes, so RTDB rules remain the critical enforcement boundary.

### Stories and Pulse

Stories have `expiresAt`, separate view records, and per-user seen state. Pulse has a global feed with separate likes. Both current feed subscriptions are global rather than cursor-bounded.

## Local persistence

### `discuss_offline`, version 1

Owned by `lib/db.js`; stores `posts`, `users`, and a generic `cache`. It is primarily a legacy cache helper and overlaps with the newer cache database.

### `discuss_cache`, version 5

Owned by `lib/cacheManager.js`; stores `posts`, `users`, `friends`, `chats`, `messages`, `cache_meta`, `comments`, `groups`, and `group_messages`, with indexes for common timestamps/owners. It lacks versioned tables for profiles, relationships, notifications, drafts, outbox operations, sync state, feed pages, and cache access/expiry metadata.

Large entity lists are additionally mirrored under the `discuss_fast_` localStorage prefix. This creates duplicate sources and makes quota/eviction behavior difficult to control. LocalStorage should remain for small settings only after migration.

## Read-efficiency findings

| Finding | Impact | Migration requirement |
|---|---|---|
| Feed reads complete posts/votes/two comment trees | Startup cost grows with total history | Cursor-query posts and hydrate counts per loaded post/summary |
| Feed listeners attach to complete posts/votes/comments nodes | Replays historical children and retains unbounded state | Bound realtime listener to feed head |
| `getPostsByUser`, stats, trending, and verification sync read complete posts | High repeated reads | Add author/time query paths and maintain compatibility |
| Chat history defaults to up to 1,000 | Large conversation startup | Local-first recent window plus cursor history |
| Group history path requests 100,000 | Effectively full history | Replace with bounded history pages |
| `getAllUsers`/relationship suggestions read the complete users tree | User-scale N+1/read amplification | Indexed lookup/search service and cached summaries |
| Pulse, DevRadar locations, News, and Jobs subscriptions are global | Unbounded listeners | Bound Pulse/DevRadar; remove News/Jobs active consumers |

## Rules and indexes

Rule snapshots exist only for the third, fourth, and fifth databases. Their root rules allow any authenticated user to read and write the entire database. This is insufficient for message participant checks, group membership/role enforcement, Blink privacy, and ownership validation. `firebase.json` deploys only functions, so rule files are not currently declared as deploy targets.

Observed indexes:

- Chat: message `timestamp`, user-chat `lastMessageTime`, chat `updatedAt`, Blink registry `expiresAt`.
- Groups: group-message `timestamp`; user-group `lastMessageTime` and `joinedAt`.
- Stories: story `expiresAt` and story-view values.

Missing/undocumented indexes relevant to current or planned queries include primary post `timestamp` and `author_id`, Pulse `createdAt`, user lookup fields where index nodes cannot be used, notification time/read state, relationship status, and DevRadar freshness. Indexes must be added alongside actual bounded queries, not speculatively.

## Data-safety migration rules

- Do not rename or delete remote nodes during the local-first rollout.
- Use compatibility readers (`newField ?? oldField`) and additive writes.
- Preserve pushed IDs and all existing media references.
- Do not infer successful remote sync from a local optimistic state.
- Do not remove the primary/secondary dual-comment read until production data is explicitly migrated and verified.
- Stop Tech News/Jobs consumers and writers, but preserve `techNews` and `jobs` remote history.
