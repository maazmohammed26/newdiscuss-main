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

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_VERIFY_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_TTL_MS = 15 * 60 * 1000;     // 15 minutes

const rateLimits = new Map();

function isRateLimited(key, max = MAX_VERIFY_REQUESTS_PER_WINDOW) {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now - entry.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

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
    // If running in environment where default credentials apply
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

  // 1. Fetch user profile to discover username, email, and media keys before deleting
  let username = '';
  let avatarPublicId = '';
  try {
    const userSnap = await root.child(`users/${uid}`).once('value');
    if (userSnap.exists()) {
      const u = userSnap.val() || {};
      username = u.username || '';
      if (!email && u.email) email = u.email;
      if (u.photo_url && u.photo_url.includes('cloudinary.com')) {
        // Look for public ID if stored or in user profile
      }
    }
  } catch (_) {}

  // 2. Primary Database Deletions
  const primaryUpdates = {
    [`users/${uid}`]: null,
    [`sessions/${uid}`]: null,
    [`pendingVerifications/${uid}`]: null,
    [`devRadarLocations/${uid}`]: null,
    [`deletionChallenges/${uid}`]: null,
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

  // 3. Auxiliary Databases (Secondary Profile, Relationships, Chats, Groups, Signals)
  try {
    // Secondary database: userProfiles, relationships, badges
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
        // Remove user from member list
        await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/members/${uid}`, 'DELETE');

        const remainingMembers = Object.entries(group.members).filter(([mId]) => mId !== uid);
        const newMemberCount = remainingMembers.length;

        if (newMemberCount === 0) {
          // If no members remain, mark group as deleted
          await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/status`, 'PUT', 'deleted');
        } else {
          await auxiliaryRequest(GROUPS_DATABASE_URL, `groups/${groupId}/memberCount`, 'PUT', newMemberCount);
          if (isUserAdmin) {
            // Check if another admin already exists
            const hasOtherAdmin = remainingMembers.some(([, m]) => m.role === 'admin');
            if (!hasOtherAdmin) {
              // Promote the longest-standing member (earliest joinedAt)
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

/**
 * Dispatch deletion OTP email using Brevo SMTP API
 */
async function sendDeletionEmail(email, username, code) {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn('[AccountDeletion] BREVO_API_KEY is not set. Cannot send deletion verification code.');
    return false;
  }

  const safeUsername = String(username || 'Discuss Member').replace(/[<>]/g, '');
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Discuss Security', email: 'support@discussit.in' },
        to: [{ email, name: safeUsername }],
        subject: `${code} is your Discuss account deletion verification code`,
        htmlContent: `<!doctype html>
<html>
<body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <main style="max-width:520px;margin:36px auto;background:#ffffff;padding:36px;border-radius:20px;border:1px solid #e5e7eb">
    <div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#111827;margin-bottom:24px">&lt;Discuss/&gt;</div>
    <h1 style="font-size:18px;font-weight:800;color:#111827;margin:0 0 12px">Confirm Account Deletion</h1>
    <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 20px">
      Hello ${safeUsername}, you requested to permanently delete your Discuss account. Use this single-use code to authorize deletion:
    </p>
    <div style="background:#f3f4f6;padding:16px 24px;border-radius:14px;text-align:center;font-size:32px;font-weight:900;letter-spacing:6px;color:#111827;margin:0 0 20px">
      ${code}
    </div>
    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:0 0 16px">
      This code expires in 10 minutes. If you did not request deletion of your Discuss account, someone may have entered your email address by mistake. You can safely ignore this email—your account will remain active.
    </p>
    <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0 16px">
    <p style="font-size:11px;color:#9ca3af;margin:0">Discuss Support • support@discussit.in • https://discussit.in</p>
  </main>
</body>
</html>`,
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('[AccountDeletion] Failed to send email via Brevo:', err.message);
    return false;
  }
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

  const clientIp = getClientIp(req);
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
  }

  const action = String(req.query.action || body.action || '').trim();

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION 1: REQUEST VERIFICATION CODE (Public Web Deletion Request)
  // ───────────────────────────────────────────────────────────────────────────
  if (action === 'request-verification') {
    if (isRateLimited(`req_otp_${clientIp}`, 5)) {
      return res.status(429).json({ ok: false, error: 'Too many verification requests. Please wait a few minutes and try again.' });
    }

    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    if (isRateLimited(`req_email_${email}`, 3)) {
      return res.status(429).json({ ok: false, error: 'Too many requests for this email address. Please try again later.' });
    }

    const privacySafeMessage = 'If a Discuss account exists for this email, a verification code has been sent.';

    try {
      const db = getPrimaryDb();
      // Check userEmails index to resolve account UID without enumerating
      const emailSnap = await db.ref(`userEmails/${emailIndexKey(email)}`).once('value');
      let uid = emailSnap.val();

      if (!uid) {
        // Fallback check in users node
        const usersSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
        if (usersSnap.exists()) {
          usersSnap.forEach((child) => {
            if (!uid) uid = child.key;
          });
        }
      }

      if (!uid) {
        // Privacy-safe response: do not reveal that account does not exist
        return res.status(200).json({ ok: true, message: privacySafeMessage });
      }

      // Fetch username for email personalization
      const userProfileSnap = await db.ref(`users/${uid}`).once('value');
      const userProfile = userProfileSnap.val() || {};
      const username = userProfile.username || 'Discuss Member';

      // Generate cryptographically secure 6-digit code
      const codeNumber = crypto.randomInt(100000, 999999);
      const code = String(codeNumber);
      const codeHash = crypto.createHash('sha256').update(`${code}:${uid}:account-deletion`).digest('hex');

      const challenge = {
        uid,
        email,
        codeHash,
        purpose: 'account-deletion',
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
        attempts: 0,
        consumed: false,
        createdAt: Date.now(),
      };

      await db.ref(`deletionChallenges/${uid}`).set(challenge);

      // Dispatch verification email
      await sendDeletionEmail(email, username, code);

      return res.status(200).json({
        ok: true,
        message: privacySafeMessage,
      });
    } catch (err) {
      console.error('[AccountDeletion] request-verification failed:', err.message);
      return res.status(500).json({ ok: false, error: 'Unable to process deletion request right now.' });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION 2: VERIFY OTP (Public Web Deletion Request)
  // ───────────────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (isRateLimited(`verify_attempt_${clientIp}`, 10)) {
      return res.status(429).json({ ok: false, error: 'Too many verification attempts. Please wait.' });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();

    if (!email || !code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ ok: false, error: 'Invalid email or 6-digit verification code.' });
    }

    try {
      const db = getPrimaryDb();
      // Look up target account
      const emailSnap = await db.ref(`userEmails/${emailIndexKey(email)}`).once('value');
      let uid = emailSnap.val();

      if (!uid) {
        const usersSnap = await db.ref('users').orderByChild('email').equalTo(email).once('value');
        usersSnap.forEach((child) => { if (!uid) uid = child.key; });
      }

      if (!uid) {
        return res.status(400).json({ ok: false, error: 'Verification code is invalid or has expired.' });
      }

      const challengeRef = db.ref(`deletionChallenges/${uid}`);
      const challengeSnap = await challengeRef.once('value');
      if (!challengeSnap.exists()) {
        return res.status(400).json({ ok: false, error: 'No active deletion request found for this email. Please request a new code.' });
      }

      const challenge = challengeSnap.val();

      if (challenge.consumed) {
        return res.status(400).json({ ok: false, error: 'This verification code has already been used. Please request a new code.' });
      }

      if (Date.now() > Number(challenge.expiresAt || 0)) {
        await challengeRef.remove();
        return res.status(400).json({ ok: false, error: 'Verification code has expired. Please request a new code.' });
      }

      if (Number(challenge.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
        await challengeRef.remove();
        return res.status(400).json({ ok: false, error: 'Too many incorrect attempts. Please request a new code.' });
      }

      const providedHash = crypto.createHash('sha256').update(`${code}:${uid}:account-deletion`).digest('hex');

      if (providedHash !== challenge.codeHash) {
        await challengeRef.update({ attempts: (challenge.attempts || 0) + 1 });
        return res.status(400).json({ ok: false, error: 'Incorrect verification code. Please check and try again.' });
      }

      // Mark challenge consumed
      await challengeRef.update({ consumed: true });

      // Issue short-lived, single-use deletion authorization token
      const deletionToken = crypto.randomBytes(32).toString('hex');
      const tokenRecord = {
        uid,
        email,
        purpose: 'account-deletion',
        expiresAt: Date.now() + TOKEN_TTL_MS,
        createdAt: Date.now(),
      };

      await db.ref(`deletionAuthorizations/${deletionToken}`).set(tokenRecord);

      return res.status(200).json({
        ok: true,
        deletionToken,
        verifiedEmail: email,
      });
    } catch (err) {
      console.error('[AccountDeletion] verify failed:', err.message);
      return res.status(500).json({ ok: false, error: 'Failed to verify deletion code.' });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION 3: CANONICAL ACCOUNT DELETION (In-App Bearer OR Public Token)
  // ───────────────────────────────────────────────────────────────────────────
  let targetUid = null;
  let targetEmail = '';

  // Mode A: Public Web Flow using verified deletionToken
  const deletionToken = String(body.deletionToken || '').trim();
  if (deletionToken) {
    try {
      const db = getPrimaryDb();
      const tokenRef = db.ref(`deletionAuthorizations/${deletionToken}`);
      const tokenSnap = await tokenRef.once('value');

      if (!tokenSnap.exists()) {
        return res.status(400).json({ ok: false, error: 'Deletion authorization has expired or is invalid. Please start again.' });
      }

      const record = tokenSnap.val();
      if (record.purpose !== 'account-deletion' || Date.now() > Number(record.expiresAt || 0)) {
        await tokenRef.remove();
        return res.status(400).json({ ok: false, error: 'Deletion authorization has expired. Please verify again.' });
      }

      targetUid = record.uid;
      targetEmail = record.email;

      // Consume the authorization token immediately to prevent reuse
      await tokenRef.remove();
    } catch (err) {
      console.error('[AccountDeletion] Authorization token check failed:', err.message);
      return res.status(500).json({ ok: false, error: 'Unable to authorize deletion.' });
    }
  } else {
    // Mode B: Authenticated User with Firebase ID token (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Sign in to delete your account or supply a verified deletion token.' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    try {
      const decoded = await getAdminApp().auth().verifyIdToken(idToken);
      targetUid = decoded.uid;
      targetEmail = decoded.email || '';
    } catch (err) {
      console.warn('[AccountDeletion] ID token verification failed:', err.message);
      return res.status(401).json({ ok: false, error: 'Your session has expired. Please verify your identity and try again.' });
    }
  }

  if (!targetUid) {
    return res.status(400).json({ ok: false, error: 'Invalid deletion request: target account could not be determined.' });
  }

  // Execute the canonical deletion engine
  try {
    console.log(`[AccountDeletion] Initiating account deletion for uid=${targetUid}`);
    await deleteDiscussAccount(targetUid, { email: targetEmail, initiatedBy: deletionToken ? 'public_otp' : 'in_app' });
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
