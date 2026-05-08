# Admin Message Feature - Implementation Guide

## Overview
This feature allows admins to send personalized messages to specific users that appear in their profile page, above the theme selector.

---

## Backend Structure (Firebase)

### User Document Schema
```javascript
{
  "users": {
    "user_id_123": {
      "username": "test1",
      "email": "test@gmail.com",
      "verified": false,
      "admin_message": "",  // ← NEW FIELD
      "photo_url": "",
      "auth_provider": "email",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## How to Set Admin Message for a User

### Method 1: Firebase Console (Manual)
1. Open Firebase Console
2. Go to Realtime Database (or Firestore if using that)
3. Navigate to: `users/{user_id}/`
4. Add or edit field: `admin_message`
5. Set value (examples below)

### Method 2: Firebase SDK (Programmatic)
```javascript
import { ref, update } from 'firebase/database';
import { database } from './firebase';

// Set admin message for a specific user
const setUserAdminMessage = async (userId, message) => {
  const userRef = ref(database, `users/${userId}`);
  await update(userRef, {
    admin_message: message
  });
};

// Example usage:
await setUserAdminMessage('user_id_123', 'Welcome to our platform! Your account has been upgraded.');
```

---

## Example Messages

### No Message (Default)
```javascript
"admin_message": ""
// Result: No message box shown in profile
```

### Welcome Message
```javascript
"admin_message": "Welcome to Discuss! Thank you for being an early supporter."
// Result: Message appears above theme selector in profile
```

### Account Status
```javascript
"admin_message": "Your account has been upgraded to Premium. Enjoy exclusive features!"
```

### Warning Message
```javascript
"admin_message": "Please update your profile information to continue using all features."
```

### Verification Approved
```javascript
"admin_message": "Congratulations! Your verification request has been approved."
```

### Custom Announcement
```javascript
"admin_message": "Special event: Join our developer meetup on Jan 15th!"
```

---

## Visual Appearance

### Message Box (When admin_message is set)
```
╔════════════════════════════════════════╗
║  <>  Admin message: Your message here  ║ [X]
╚════════════════════════════════════════╝
```
- **Icon**: `<` (blue) `>` (red)
- **Location**: Profile page, above "Theme" section
- **Dismissible**: Yes (user can close it)
- **Theme Support**: Light, Dark, Discuss

---

## Testing Examples

### Test User 1: No Message
```json
{
  "users": {
    "abc123": {
      "username": "johndoe",
      "email": "john@example.com",
      "verified": true,
      "admin_message": ""
    }
  }
}
```
**Result**: No message shown ✓

---

### Test User 2: Welcome Message
```json
{
  "users": {
    "def456": {
      "username": "janedoe",
      "email": "jane@example.com",
      "verified": false,
      "admin_message": "Welcome! Complete your first post to unlock badges."
    }
  }
}
```
**Result**: Message appears in profile ✓

---

### Test User 3: Account Update
```json
{
  "users": {
    "ghi789": {
      "username": "testuser",
      "email": "test@gmail.com",
      "verified": true,
      "admin_message": "Your account is under review. Please check back in 24 hours."
    }
  }
}
```
**Result**: Message with admin icon appears ✓

---

## Code Changes Summary

### 1. New Component Created
- **File**: `/app/frontend/src/components/UserAdminMessage.js`
- **Purpose**: Displays user-specific admin message
- **Features**: 
  - Blue/Red `<>` icon
  - Dismissible
  - Theme-aware styling

### 2. Profile Page Updated
- **File**: `/app/frontend/src/pages/ProfilePage.js`
- **Change**: Added `UserAdminMessage` component above theme selector
- **Condition**: Only shows if `user.admin_message` is not empty

### 3. Auth Context Updated
- **File**: `/app/frontend/src/contexts/AuthContext.js`
- **Change**: Added `admin_message` to user data sync
- **Lines**: 68, 83

### 4. Database Layer Updated
- **File**: `/app/frontend/src/lib/db.js`
- **Changes**:
  - `createUser`: Sets default `admin_message: ''`
  - `getUser`: Returns `admin_message` field

### 5. Global Admin Banner Updated
- **File**: `/app/frontend/src/components/AdminMessageBanner.js`
- **Change**: Replaced message icon with `<>` (blue/red)
- **Applies to**: Landing, Login, Register pages

---

## Admin Panel Integration (Future)

For easier management, you can create an admin panel:

```javascript
// AdminPanel.js (example)
import { ref, update } from 'firebase/database';
import { database } from './firebase';

const AdminMessageManager = () => {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, { admin_message: message });
    alert('Message sent!');
  };

  return (
    <div>
      <input 
        placeholder="User ID" 
        value={userId} 
        onChange={(e) => setUserId(e.target.value)} 
      />
      <textarea 
        placeholder="Admin message" 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
      />
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};
```

---

## Firebase Rules (Optional)

Ensure only admins can set `admin_message`:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".write": "$uid === auth.uid",
        "admin_message": {
          ".write": "root.child('admins').child(auth.uid).exists()"
        }
      }
    }
  }
}
```

---

## Complete Example: Setting Message via Firebase Console

### Step-by-Step:
1. Go to Firebase Console → Realtime Database
2. Navigate to `users/YOUR_USER_ID/`
3. Click "+" to add a child
4. Name: `admin_message`
5. Value: `"Your custom message here"`
6. Click "Add"

### Result:
User will see this message in their profile page when they login!

---

## Message Display Logic

```javascript
// In ProfilePage.js
{user?.admin_message && (
  <div className="mt-6">
    <UserAdminMessage message={user.admin_message} />
  </div>
)}
```

**Conditions:**
- ✅ Shows if `admin_message` exists AND is not empty
- ❌ Hidden if `admin_message` is empty string or undefined
- ❌ Hidden if user dismissed it (stored in component state)

---

## Summary

### Files Modified/Created:
1. ✅ `UserAdminMessage.js` (NEW) - User message component
2. ✅ `ProfilePage.js` - Displays user message
3. ✅ `AuthContext.js` - Syncs admin_message
4. ✅ `db.js` - Includes admin_message in user operations
5. ✅ `AdminMessageBanner.js` - Updated icon to `<>`

### Database Fields Added:
- `users/{user_id}/admin_message` (string, default: "")

### Testing:
- Set `admin_message` in Firebase for any user
- Login as that user
- Check profile page → Message appears above theme selector
- Dismiss message → It disappears (until page reload)

---

## Quick Test Example

```javascript
// In Firebase Console or using SDK:
users/test_user_123/admin_message = "Welcome to Discuss! 🎉"

// User logs in → Sees in profile:
// <>  Admin message: Welcome to Discuss! 🎉  [X]
```

**Done! 🚀**
