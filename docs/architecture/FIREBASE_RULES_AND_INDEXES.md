# Firebase Rules and Index Deployment

Last updated: 2026-09-08

The repository does not overwrite unknown live Firebase rules. Export each project's current rules, merge the indexes below, test with the Emulator Suite against legacy records, deploy to preview, and only then promote.

Required indexes:

- Primary: `posts/.indexOn = ["timestamp"]`; `notifications/$uid/.indexOn = ["createdAt"]`; username lookup path on the exact queried child.
- Third/chats: `messages/$chatId/.indexOn = ["timestamp"]`; `userChats/$uid/.indexOn = ["lastMessageTime"]`; `chats/.indexOn = ["updatedAt"]`; `blinkMediaRegistry/.indexOn = ["expiresAt"]`.
- Fourth/groups: `groups/$groupId/messages/.indexOn = ["timestamp"]`; `userGroups/$uid/.indexOn = ["lastMessageTime", "joinedAt"]`.
- Fifth/stories: `stories/.indexOn = ["expiresAt"]`; `storyViews/$storyId/.indexOn = [".value"]`.
- Sixth/DevRadar: index `devRadarLocations` on `isPublic` if the production query is changed to server-side filtering.

`THIRD_DATABASE_RULES.json`, `FOURTH_DATABASE_RULES.json`, and `FIFTH_DATABASE_RULES.json` contain the current authenticated baselines and indexes. Before enforcing `auth != null` in auxiliary projects, configure `AUX_FIREBASE_SERVICE_ACCOUNTS_JSON` and verify `/api/aux-auth-token` for every named target. Then tighten path authorization incrementally; do not deploy a guessed wholesale replacement because existing group administration uses multi-location client writes.
