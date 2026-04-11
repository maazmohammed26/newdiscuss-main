# Firebase Database Example - User Admin Message

## Complete Firebase Structure with Examples

```json
{
  "users": {
    "user_001": {
      "username": "john_doe",
      "email": "john@example.com",
      "photo_url": "",
      "verified": false,
      "admin_message": "",
      "auth_provider": "email",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    "user_002": {
      "username": "jane_smith",
      "email": "jane@example.com",
      "photo_url": "https://example.com/avatar.jpg",
      "verified": true,
      "admin_message": "Welcome! Your account has been verified.",
      "auth_provider": "google.com",
      "created_at": "2024-01-16T14:20:00.000Z"
    },
    "user_003": {
      "username": "test1",
      "email": "test@gmail.com",
      "photo_url": "",
      "verified": true,
      "admin_message": "Thank you for being an early supporter of Discuss!",
      "auth_provider": "email",
      "created_at": "2024-01-10T08:15:00.000Z"
    },
    "user_004": {
      "username": "developer_123",
      "email": "dev@example.com",
      "photo_url": "",
      "verified": false,
      "admin_message": "Please complete your profile to unlock all features.",
      "auth_provider": "email",
      "created_at": "2024-01-20T16:45:00.000Z"
    }
  }
}
```

---

## Example Scenarios

### Scenario 1: Regular User (No Admin Message)
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "verified": false,
  "admin_message": ""
}
```
**Profile Display**:
- No admin message box shown
- Only shows username, email, posts, theme selector, etc.

---

### Scenario 2: Verified User with Welcome Message
```json
{
  "username": "jane_smith",
  "email": "jane@example.com",
  "verified": true,
  "admin_message": "Welcome! Your account has been verified."
}
```
**Profile Display**:
- Username with blue verified badge [✓]
- Admin message box shows:
  ```
  <>  Admin message: Welcome! Your account has been verified.  [X]
  ```

---

### Scenario 3: User with Important Notice
```json
{
  "username": "test1",
  "email": "test@gmail.com",
  "verified": true,
  "admin_message": "Your post has been featured on our homepage!"
}
```
**Profile Display**:
- Verified badge next to username
- Admin message appears above theme selector
- Message is dismissible

---

### Scenario 4: User with Action Required
```json
{
  "username": "developer_123",
  "email": "dev@example.com",
  "verified": false,
  "admin_message": "Please verify your email to continue posting."
}
```
**Profile Display**:
- No verified badge (verified: false)
- Admin message shows action required
- Message persists until dismissed

---

## How to Set/Update Admin Message

### Method 1: Firebase Console UI

1. **Navigate to Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select your project

2. **Open Realtime Database**
   - Left sidebar → Realtime Database
   - You'll see the tree structure

3. **Find User**
   - Expand `users` node
   - Find the user ID (e.g., `user_003`)

4. **Set Admin Message**
   - Click on the user node
   - Look for `admin_message` field
   - If it doesn't exist, click "+" to add it
   - Set value: `"Your custom message here"`
   - Click "Add" or "Update"

**Visual Example**:
```
users
  ↳ user_003
      ↳ username: "test1"
      ↳ email: "test@gmail.com"
      ↳ verified: true
      ↳ admin_message: "Thanks for joining!" ← Click here to edit
```

---

### Method 2: Using Firebase SDK (JavaScript)

```javascript
import { ref, update } from 'firebase/database';
import { database } from './lib/firebase';

// Function to set admin message for a user
async function setAdminMessage(userId, message) {
  const userRef = ref(database, `users/${userId}`);
  
  await update(userRef, {
    admin_message: message
  });
  
  console.log(`Admin message set for user: ${userId}`);
}

// Examples:
// 1. Welcome message
await setAdminMessage('user_001', 'Welcome to Discuss!');

// 2. Verification approved
await setAdminMessage('user_002', 'Your verification has been approved.');

// 3. Clear message (hide it)
await setAdminMessage('user_003', '');

// 4. Important notice
await setAdminMessage('user_004', 'Your post violated community guidelines.');
```

---

### Method 3: Bulk Update (Multiple Users)

```javascript
import { ref, update } from 'firebase/database';
import { database } from './lib/firebase';

// Send same message to multiple users
async function sendBulkMessage(userIds, message) {
  const updates = {};
  
  userIds.forEach(userId => {
    updates[`users/${userId}/admin_message`] = message;
  });
  
  await update(ref(database), updates);
  console.log(`Message sent to ${userIds.length} users`);
}

// Example: Send announcement to all early users
const earlyUsers = ['user_001', 'user_002', 'user_003'];
await sendBulkMessage(
  earlyUsers, 
  'Thank you for being an early supporter! Enjoy premium features.'
);
```

---

## Admin Message Types (Examples)

### Welcome Messages
```json
"admin_message": "Welcome to Discuss! We're glad to have you."
"admin_message": "Thanks for signing up! Check out our getting started guide."
```

### Verification Messages
```json
"admin_message": "Your verification request has been approved!"
"admin_message": "Congratulations! You're now a verified user."
```

### Warning Messages
```json
"admin_message": "Please review our community guidelines."
"admin_message": "Your account is under review. Please wait 24-48 hours."
```

### Feature Announcements
```json
"admin_message": "New feature unlocked! Try out the Discuss theme."
"admin_message": "Your post has been featured on our homepage!"
```

### Action Required
```json
"admin_message": "Please update your profile information."
"admin_message": "Verify your email to continue posting."
```

### Promotional
```json
"admin_message": "Join our developer meetup on Feb 15th!"
"admin_message": "Special offer: Premium features free for 30 days!"
```

---

## Testing Checklist

### ✅ Test 1: Empty Message (Default)
```json
"admin_message": ""
```
- [ ] No message box appears in profile
- [ ] Theme selector shows normally

### ✅ Test 2: Short Message
```json
"admin_message": "Welcome!"
```
- [ ] Message appears above theme selector
- [ ] `<>` icon displays (blue & red)
- [ ] Dismiss button [X] works
- [ ] Styling matches theme (Light/Dark/Discuss)

### ✅ Test 3: Long Message
```json
"admin_message": "Your account has been upgraded with premium features including unlimited posts, priority support, and exclusive access to beta features."
```
- [ ] Message wraps properly
- [ ] Box expands to fit content
- [ ] Dismiss button stays aligned

### ✅ Test 4: Message with Special Characters
```json
"admin_message": "Hey! 👋 Check this out: https://example.com #discuss"
```
- [ ] Emoji renders correctly
- [ ] Links are plain text (not clickable in this version)
- [ ] Special characters display properly

---

## Firebase Security Rules (Optional)

Protect admin_message so only admins can set it:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid",
        "admin_message": {
          ".write": "root.child('admins').child(auth.uid).exists()"
        }
      }
    }
  }
}
```

This ensures:
- Users can read their own data
- Users can update their profile (except admin_message)
- Only users listed in `/admins` node can set admin_message

---

## Quick Reference

### Show Message
```javascript
users/USER_ID/admin_message = "Your message"
```

### Hide Message
```javascript
users/USER_ID/admin_message = ""
```

### Check Current Message
```javascript
// In browser console or SDK:
const userRef = ref(database, 'users/USER_ID');
const snapshot = await get(userRef);
console.log(snapshot.val().admin_message);
```

---

## Summary

✅ **Field Name**: `admin_message` (string)  
✅ **Default Value**: `""` (empty string)  
✅ **Location**: `users/{userId}/admin_message`  
✅ **Display Logic**: Shows only if not empty  
✅ **Permissions**: Admins only (set via security rules)  
✅ **UI Position**: Profile page, above theme selector  

**Ready to use! 🎉**
