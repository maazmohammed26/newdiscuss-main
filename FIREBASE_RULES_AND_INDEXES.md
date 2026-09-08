# Firebase Realtime Database Rules & Indexes Specification

> [!WARNING]
> **STATUS: REQUIRES LIVE FIREBASE RULE DEPLOYMENT**
> Updating local repository files or documentation does NOT deploy or update live rules in the Google Cloud / Firebase console.
> The production console index warnings will persist until a project administrator deploys these rules to the active Firebase projects.

---

## 1. Overview & Production Console Warnings Audit

The production developer console reported the following index warnings during real-time queries:

1. **Stories Index Warning**:
   ```text
   [FIREBASE WARNING] Using an unspecified index on /stories. Consider adding ".indexOn": "expiresAt" at /stories to your security rules for better performance.
   ```
   - **Query**: Filter stories by expiration timestamp (`orderByChild('expiresAt')`).
   - **Target Database**: Signal / Fifth Firebase (`signalDb` - `FIFTH_DATABASE_RULES.json`).

2. **Notifications Index Warning**:
   ```text
   [FIREBASE WARNING] Using an unspecified index on /notifications/$uid. Consider adding ".indexOn": "createdAt" at /notifications/$uid to your security rules for better performance.
   ```
   - **Query**: Fetch and listen to recipient notifications sorted by creation timestamp (`orderByChild('createdAt')`, `limitToLast(50)`).
   - **Target Database**: Primary Firebase (`database` - `notifications/$uid`).

---

## 2. Production Rules & Indexes by Database Instance

### A. Primary Database (Core Platform & Notifications)

Preserves user authentication and privacy boundaries while indexing notifications by `createdAt`:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "users": {
      "$uid": {
        ".read": true,
        ".write": "auth != null && auth.uid === $uid"
      }
    },

    "posts": {
      ".read": true,
      ".write": "auth != null",
      ".indexOn": ["timestamp", "author_id", "type"]
    },

    "pulses": {
      ".read": true,
      ".write": "auth != null",
      ".indexOn": ["createdAt", "userId"]
    },

    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null",
        ".indexOn": ["createdAt"]
      }
    },

    "comments": {
      "$postId": {
        ".read": true,
        ".write": "auth != null",
        ".indexOn": ["timestamp"]
      }
    }
  }
}
```

### B. Fifth Database (`signalDb` / Stories)

Preserves authenticated access while indexing active stories by `expiresAt`:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "stories": {
      ".indexOn": ["expiresAt"]
    },
    "storyViews": {
      "$storyId": {
        ".indexOn": [".value"]
      }
    }
  }
}
```

### C. Third Database (Direct Messages & Chats)

Preserves existing chat messaging index rules:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "messages": {
      "$chatId": {
        ".indexOn": ["timestamp"]
      }
    },
    "userChats": {
      "$uid": {
        ".indexOn": ["lastMessageTime"]
      }
    },
    "chats": {
      ".indexOn": ["updatedAt"]
    },
    "blinkMediaRegistry": {
      ".indexOn": ["expiresAt"]
    }
  }
}
```

---

## 3. Live Deployment Instructions

Because Firebase Realtime Database rules cannot be applied solely via client-side code:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select the appropriate Discuss project (`primary`, `third`, or `fifth/signal`).
3. Navigate to **Build** -> **Realtime Database** -> **Rules**.
4. Paste the respective configuration from above.
5. Click **Publish**.
