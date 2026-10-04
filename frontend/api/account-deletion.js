'use strict';

const crypto = require('crypto');
const admin = require('firebase-admin');
const { isAllowedOrigin } = require('../server/requestSecurity');

const PRIMARY_DATABASE_URL = process.env.PRIMARY_DATABASE_URL
  || 'https://discuss-13fbc-default-rtdb.firebaseio.com';
const SECONDARY_DATABASE_URL = process.env.SECONDARY_DATABASE_URL
  || 'https://discussit-5879b-default-rtdb.firebaseio.com';
const CHATS_DATABASE_URL = process.env.CHATS_DATABASE_URL
  || 'https://discuss-f1f56-default-rtdb.firebaseio.com';
const GROUPS_DATABASE_URL = process.env.GROUPS_DATABASE_URL
  || 'https://discuss-3c060-default-rtdb.firebaseio.com';
const SIGNALS_DATABASE_URL = process.env.SIGNALS_DATABASE_URL
  || 'https://discuss-d48be-default-rtdb.firebaseio.com';
const DEVRADAR_DATABASE_URL = process.env.DEVRADAR_DATABASE_URL
  || 'https://discuss-74b96-default-rtdb.firebaseio.com';

function emailIndexKey(email = '') {
  return String(email).toLowerCase().trim().replace(/\./g, ',');
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.private_key) value.private_key = value.private_key.replace(/\\n/g, '\n');
    return value;
  } catch (_) {
    return null;
  }
}

let primaryApp;
function getAdminApp() {
  if (primaryApp) return primaryApp;
  const existing = admin.apps.find((a) => a.name === 'discuss-deletion-admin' || a.name === 'discuss-audio-primary' || a.name === '[DEFAULT]');
  if (existing) {
    primaryApp = existing;
    return primaryApp;
  }
  const sa = getServiceAccount();
  if (sa) {
    primaryApp = admin.initializeApp({
      credential: admin.credential.cert(sa),
      databaseURL: PRIMARY_DATABASE_URL,
      projectId: 'discuss-13fbc',
    }, 'discuss-deletion-admin');
  } else {
    try {
      primaryApp = admin.initializeApp({
        databaseURL: PRIMARY_DATABASE_URL,
        projectId: 'discuss-13fbc',
      }, 'discuss-deletion-admin');
    } catch (_) {
      primaryApp = admin.app();
    }
  }
  return primaryApp;
}

function getPrimaryDb() {
  return getAdminApp().database();
}

const auxiliaryRequest = async (baseUrl, path, method = 'GET', body) => {
  const safePath = String(path || '').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${safePath}.json`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  } catch (err) {
    console.warn(`[AuxiliaryRequest] failed for ${baseUrl}/${safePath}:`, err.message);
    return null;
  }
};

/**
 * Destroy Cloudinary asset server-side if configured
 */
async function destroyCloudinaryAssetServer(publicId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.REACT_APP_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!publicId || !cloudName || !apiKey || !apiSecret) return false;

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const shasum = crypto.createHash('sha1');
    shasum.update(stringToSign);
    const signature = shasum.digest('hex');

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('invalidate', 'true');
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return data.result === 'ok' || data.result === 'not found';
  } catch (e) {
    console.warn('[Cloudinary] Deletion error:', e.message);
    return false;
  }
}

/**
 * Canonical Server-Side Deletion Engine:
 * Cleans all primary & auxiliary user data, cleans group/chat references,
 * removes exclusive media, and deletes Firebase Auth record.
 */
async function deleteDiscussAccount(uid, { email = '', initiatedBy = 'user' } = {}) {
  const db = getPrimaryDb();
  const root = db.ref();

  // 1. Discover username, email, and media keys before deleting
  let username = '';
  try {
    const userSnap = await root.child(`users/${uid}`).once('value');
    if (userSnap.exists()) {
      const u = userSnap.val() || {};
      username = u.username || '';
      if (!email && u.email) email = u.email;
    }
  } catch (_) {}

  // 2. Primary Database Deletions
  const primaryUpdates = {
    [`users/${uid}`]: null,
    [`sessions/${uid}`]: null,
    [`pendingVerifications/${uid}`]: null,
    [`devRadarLocations/${uid}`]: null,
  };

  if (username) {
    primaryUpdates[`usernames/${username.toLowerCase()}`] = null;
  }
  if (email) {
    primaryUpdates[`userEmails/${emailIndexKey(email)}`]: null;
  }

  // Delete all posts authored by this user
  try {
    const postsSnap = await root.child('posts').orderByChild('author_id').equalTo(uid).once('value');
    postsSnap.forEach((p) => {
      primaryUpdates[`posts/${p.key}`] = null;
      primaryUpdates[`postComments/${p.key}`] = null;
    });
  } catch (_) {}

  await root.update(primaryUpdates).catch((e) => console.warn('[AccountDeletion] Primary DB update warning:', e.message));

  // 3. Auxiliary Databases (Secondary Profile, Relationships, Badges)
  try {
    await auxiliaryRequest(SECONDARY_DATABASE_URL, `userProfiles/${uid}`, 'DELETE');
    await auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${uid}`, 'DELETE');
    await auxiliaryRequest(SECONDARY_DATABASE_URL, `commentBadges/${uid}`, 'DELETE');
    await auxiliaryRequest(SECONDARY_DATABASE_URL, `replyBadges/${uid}`, 'DELETE');

    // Remove user references from other people's relationships (friends, requests)
    const rels = await auxiliaryRequest(SECONDARY_DATABASE_URL, 'relationships', 'GET');
    if (rels && typeof rels === 'object') {
      for (const [otherUid, data] of Object.entries(rels)) {
        if (otherUid === uid || !data) continue;
        if (data.friends && data.friends[uid]) {
          await auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${otherUid}/friends/${uid}`, 'DELETE');
        }
        if (data.sentRequests && data.sentRequests[uid]) {
          await auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${otherUid}/sentRequests/${uid}`, 'DELETE');
        }
        if (data.receivedRequests && data.receivedRequests[uid]) {
          await auxiliaryRequest(SECONDARY_DATABASE_URL, `relationships/${otherUid}/receivedRequests/${uid}`, 'DELETE');
        }
      }
    }
  } catch (err) {
    console.warn('[AccountDeletion] Secondary DB cleanup error:', err.message);
  }

  // 4. Chats Database: remove deleted user's personal chat list
  try {
    await auxiliaryRequest(CHATS_DATABASE_URL, `userChats/${uid}`, 'DELETE');
    await auxiliaryRequest(CHATS_DATABASE_URL, `userUnread/${uid}`, 'DELETE');
  } catch (err) {
    console.warn('[AccountDeletion] Chats DB cleanup error:', err.message);
  }

  // 5. Groups Database: remove user from groups, handle admin succession safely
  try {
    await auxiliaryRequest(GROUPS_DATABASE_URL, `userGroups/${uid}`, 'DELETE');
    await auxiliaryRequest(GROUPS_DATABASE_URL, `userGroupInvites/${uid}`, 'DELETE');

    const groups = await auxiliaryRequest(GROUPS_DATABASE_URL, 'groups', 'GET');
    if (groups && typeof groups === 'object') {
      for (const [groupId, group] of Object.entries(groups)) {
        if (!group || !group.members || !group.members[uid]) continue;

        const isUserAdmin = group.members[uid].role === 'admin' || group.createdBy === uid;
        await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/members/${uid}`, 'DELETE');

        const remainingMembers = Object.entries(group.members).filter(([mId]) => mId !== uid);
        const newMemberCount = remainingMembers.length;

        if (newMemberCount === 0) {
          await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/status`, 'PUT', 'deleted');
        } else {
          await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/memberCount`, 'PUT', newMemberCount);
          if (isUserAdmin) {
            const hasOtherAdmin = remainingMembers.some(([, m]) => m.role === 'admin');
            if (!hasOtherAdmin) {
              remainingMembers.sort((a, b) => {
                const tA = new Date(a[1].joinedAt || 0).getTime();
                const tB = new Date(b[1].joinedAt || 0).getTime();
                return tA - tB;
              });
              const newAdminId = remainingMembers[0][0];
              await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/members/${newAdminId}/role`, 'PUT', 'admin');
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AccountDeletion] Groups cleanup error:', err.message);
  }

  // 6. Signals Database: stories, pulse
  try {
    await auxiliaryRequest(SIGNALS_DATABASE_URL, `userSeenStories/${uid}`, 'DELETE');
    const stories = await auxiliaryRequest(SIGNALS_DATABASE_URL, 'stories', 'GET');
    if (stories && typeof stories === 'object') {
      for (const [storyId, story] of Object.entries(stories)) {
        if (story && story.authorId === uid) {
          await auxiliaryRequest(SIGNALS_DATABASE_URL, `stories/${storyId}`, 'DELETE');
          await auxiliaryRequest(SIGNALS_DATABASE_URL, `storyViews/${storyId}`, 'DELETE');
        }
      }
    }
    const pulses = await auxiliaryRequest(SIGNALS_DATABASE_URL, 'pulse', 'GET');
    if (pulses && typeof pulses === 'object') {
      for (const [pulseId, p] of Object.entries(pulses)) {
        if (p && p.authorId === uid) {
          await auxiliaryRequest(SIGNALS_DATABASE_URL, `pulse/${pulseId}`, 'DELETE');
        }
      }
    }
  } catch (err) {
    console.warn('[AccountDeletion] Signals cleanup error:', err.message);
  }

  // 6b. Signals Database (Database 5): Discuss Letters cleanup
  try {
    await auxiliaryRequest(SIGNALS_DATABASE_URL, `userLetterThreads/${uid}`, 'DELETE');
    await auxiliaryRequest(SIGNALS_DATABASE_URL, `letterPolicies/${uid}`, 'DELETE');
    await auxiliaryRequest(SIGNALS_DATABASE_URL, `letterPreferences/${uid}`, 'DELETE');
    await auxiliaryRequest(SIGNALS_DATABASE_URL, `letterPendingNonFriend/${uid}`, 'DELETE');
  } catch (err) {
    console.warn('[AccountDeletion] Letters cleanup error:', err.message);
  }

  // 7. DevRadar Database: location marker
  try {
    await auxiliaryRequest(DEVRADAR_DATABASE_URL, `devRadarLocations/${uid}`, 'DELETE');
  } catch (err) {
    console.warn('[AccountDeletion] DevRadar cleanup error:', err.message);
  }

  // 8. Delete Firebase Auth user
  try {
    await getAdminApp().auth().deleteUser(uid);
    console.log(`[AccountDeletion] Firebase Auth user deleted successfully for uid=${uid}`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      console.error(`[AccountDeletion] Firebase Auth deletion failed for uid=${uid}:`, err.message);
      throw err;
    }
  }

  return { success: true };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
    return res.status(403).json({ ok: false, error: 'Request origin is not allowed.' });
  }

  // Authenticated user with Firebase ID token (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Sign in to delete your account.' });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  let targetUid = null;
  let targetEmail = '';

  try {
    const decoded = await getAdminApp().auth().verifyIdToken(idToken);
    targetUid = decoded.uid;
    targetEmail = decoded.email || '';
  } catch (err) {
    console.warn('[AccountDeletion] ID token verification failed:', err.message);
    return res.status(401).json({ ok: false, error: 'Your session has expired. Please verify your identity and try again.' });
  }

  if (!targetUid) {
    return res.status(400).json({ ok: false, error: 'Invalid deletion request: target account could not be determined.' });
  }

  // Execute the canonical deletion engine
  try {
    console.log(`[AccountDeletion] Initiating account deletion for uid=${targetUid}`);
    await deleteDiscussAccount(targetUid, { email: targetEmail, initiatedBy: 'authenticated_user' });
    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Account and associated data have been permanently removed.',
    });
  } catch (err) {
    console.error(`[AccountDeletion] Execution failed for uid=${targetUid}:`, err.message);
    return res.status(500).json({
      ok: false,
      error: 'Account deletion encountered an issue. Please try again or contact support@discussit.in.',
    });
  }
};
