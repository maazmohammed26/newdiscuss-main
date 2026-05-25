/**
 * AuthContext.js — Production-hardened authentication state manager
 *
 * Key guarantees:
 *  1. NEVER hangs in a loading state — hard 8-second timeout ensures
 *     setLoading(false) is always called, even on network failure.
 *  2. RTDB fetch has its own 5-second timeout — if Firebase Realtime Database
 *     is unreachable (blocked WiFi, ISP filtering), we fall back to auth-only
 *     user data rather than blocking forever.
 *  3. Single onAuthStateChanged subscriber — no race between currentUser
 *     check, getRedirectResult, and the listener.
 *  4. Stable useCallback deps — no re-subscription loops.
 *  5. hasResolved ref — setLoading(false) is called exactly once per
 *     auth state change.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { purgeUserSessionCaches } from '@/lib/cacheManager';
import { registerSession } from '@/lib/sessionManager';
import {
  auth,
  authReady,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from '@/lib/firebase';
import { database, ref, onValue, get } from '@/lib/firebase';
import { update, onDisconnect } from 'firebase/database';
import { isDevRadarDbAvailable, devRadarDatabase } from '@/lib/firebaseSixth';
import {
  createUser,
  getUser,
  getUserByEmail,
  checkUsernameAvailable,
  updateUser,
  syncUserVerificationEverywhere,
} from '@/lib/db';
import { syncUserVerificationInCommentsFirestore } from '@/lib/commentsDb';
import { notifyAdminUserSignup } from '@/lib/telegramService';

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTH_TIMEOUT_MS        = 8_000;   // Max wait for onAuthStateChanged to fire
const RTDB_TIMEOUT_MS        = 5_000;   // Max wait for RTDB user fetch
const USERNAME_CHECK_MS      = 3_000;   // Max wait for a single checkUsernameAvailable call
const REDIRECT_RESULT_MS     = 4_000;   // Max wait for getRedirectResult
const EMAIL_LINK_REDIRECT_URL = 'https://discussit.in/';

const AuthContext = createContext(null);

// ─── Helper: resolve to `fallback` after `ms` instead of hanging ─────────────
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Helper: fetch user from RTDB with timeout ───────────────────────────────
async function fetchUserWithTimeout(uid) {
  return Promise.race([
    getUser(uid),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('RTDB_TIMEOUT')),
        RTDB_TIMEOUT_MS
      )
    ),
  ]);
}

// ─── Helper: build a minimal "basic" user from Firebase Auth data ─────────────
function buildBasicUser(firebaseUser) {
  const email = firebaseUser.email?.toLowerCase() || '';
  let username =
    firebaseUser.displayName?.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15) ||
    email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15) ||
    'user_' + firebaseUser.uid.slice(0, 5);
    
  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    email: email,
    username: username,
    photo_url: firebaseUser.photoURL || '',
    verified: false,
    admin_message: '',
    _fromCache: true, // flag so callers know this might be stale
  };
}

const sentWelcomeEmails = new Set();

// ─── Helper: Send Welcome Email Directly via Frontend ─────────────────────────
async function sendWelcomeEmailDirectly(toEmail, username) {
  const normalizedEmail = toEmail?.toLowerCase().trim();
  if (!normalizedEmail) return;

  if (sentWelcomeEmails.has(normalizedEmail)) {
    console.log(`[AuthContext] Welcome email already sent or sending to ${normalizedEmail} in this session. Skipping.`);
    return;
  }
  sentWelcomeEmails.add(normalizedEmail);

  const apiKey = process.env.REACT_APP_BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[AuthContext] REACT_APP_BREVO_API_KEY is not defined in frontend env.');
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Discuss</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #374151;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <tr><td height="4" style="height: 4px; background: linear-gradient(90deg, #DC2626 0%, #2563EB 100%);"></td></tr>
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #111827;"><span style="color: #DC2626;">D</span>ISCUS<span style="color: #2563EB;">S</span></td></tr>
                <tr><td align="center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #9CA3AF; font-weight: 700; padding-top: 6px;">Secure Hub</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px 40px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center;">Welcome, ${username || 'Discuss Member'}!</h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 28px 0; text-align: center; font-weight: 500;">
                Hey, I'm Mohammed Maaz, founder and developer of Discuss. Thanks for joining, and welcome from the Discuss team!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #DC2626; line-height: 1.2;">01 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Real-time Chats & Groups</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect immediately with direct messaging and feature-rich group conversations.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #2563EB; line-height: 1.2;">02 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Telegram Notifications</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Connect your Telegram under Profile to receive lightning-fast alerts even when offline.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12" style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB; margin-bottom: 12px; display: block;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="48" valign="top" style="font-family: monospace; font-size: 15px; font-weight: 800; color: #4B5563; line-height: 1.2;">03 //</td>
                        <td valign="top">
                          <h4 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase; tracking: 0.05em;">Privacy & Protection</h4>
                          <p style="font-size: 13px; line-height: 1.4; color: #6B7280; margin: 0;">Enjoy state-of-the-art security, PIN locks, and advanced data encryption controls.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding: 0 40px;"><div style="border-top: 1px solid #E5E7EB; height: 1px;"></div></td></tr>
          <tr>
            <td align="center" style="padding: 30px 40px 40px 40px;">
              <p style="font-size: 11px; line-height: 1.6; color: #6B7280; margin: 0 0 16px 0; max-width: 440px;">
                You received this email because you created an account on Discuss. If you did not register, please ignore this email.
              </p>
              <p style="font-size: 11px; line-height: 1.6; color: #DC2626; font-weight: 700; margin: 0 0 20px 0; max-width: 440px;">
                ⚠️ WARNING: If this account was not registered by you, please immediately email us at <a href="mailto:support@discussit.in" style="color: #DC2626; text-decoration: underline; font-weight: 800;">support@discussit.in</a> to immediately block the account.
              </p>
              <p style="font-size: 12px; font-weight: 700; color: #4B5563; margin: 0;">
                Developed by <a href="https://www.maazportfolio.site/" target="_blank" style="color: #4B5563; text-decoration: none; font-weight: 800; background: linear-gradient(120deg, #DC2626 0%, #2563EB 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">&lt;mma/&gt;</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: '<Discuss/>', email: 'support@discussit.in' },
        to: [{ email: toEmail, name: username || 'Discuss Member' }],
        subject: 'Welcome to Discuss!',
        htmlContent: htmlContent
      })
    });
    if (response.ok) {
      console.log(`[AuthContext] Direct welcome email successfully triggered to ${toEmail}`);
    } else {
      const data = await response.text();
      console.error('[AuthContext] Failed to trigger welcome email directly:', data);
    }
  } catch (err) {
    console.error('[AuthContext] Network error triggering welcome email directly:', err.message);
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]                         = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [pendingVerification, setPendingVerification] = useState(false);

  // Ref guards to prevent double-resolution
  const hasResolved     = useRef(false);
  const hardTimeoutRef  = useRef(null);
  const sessionCleanupRef = useRef(null);

  // ── resolve: called exactly once per auth-state cycle ──────────────────
  const resolve = useCallback(() => {
    if (hasResolved.current) return;
    hasResolved.current = true;
    clearTimeout(hardTimeoutRef.current);
    setLoading(false);
  }, []);

  // ── Session registration helper ─────────────────────────────────────────
  const registerSessionForUser = useCallback((userData) => {
    if (!userData?.id) return;
    if (sessionCleanupRef.current) {
      sessionCleanupRef.current();
      sessionCleanupRef.current = null;
    }
    registerSession(userData.id, async () => {
      console.warn('[Auth] Session kicked — signing out.');
      try {
        await purgeUserSessionCaches(userData.id);
        await firebaseSignOut(auth);
        setUser(null);
      } catch (e) {
        console.error('[Auth] Kick sign-out error:', e);
      }
    }).then((cleanup) => {
      sessionCleanupRef.current = cleanup;
    });
  }, []);

  // ── syncUser: fetch full profile from RTDB, with timeout fallback ───────
  const syncUser = useCallback(
    async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return null;
      }

      let dbUser = null;
      let timedOut = false;

      try {
        dbUser = await fetchUserWithTimeout(firebaseUser.uid);
      } catch (err) {
        if (err.message === 'RTDB_TIMEOUT') {
          timedOut = true;
          console.warn('[Auth] RTDB fetch timed out — using cached auth data.');
        } else {
          console.error('[Auth] RTDB fetch error:', err);
        }
      }

      // ── RTDB timed out or errored: use Firebase Auth data as fallback ──
      if (timedOut) {
        // Still try to create the user record in the background
        if (timedOut && firebaseUser) {
          (async () => {
            try {
              const existing = await getUser(firebaseUser.uid);
              if (!existing) {
                const email = firebaseUser.email?.toLowerCase();
                let username =
                  firebaseUser.displayName
                    ?.replace(/[^a-zA-Z0-9_]/g, '')
                    .toLowerCase()
                    .slice(0, 15) ||
                  email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) ||
                  'user';
                await createUser(firebaseUser.uid, {
                  username,
                  email,
                  photo_url: firebaseUser.photoURL || '',
                  auth_provider: firebaseUser.providerData[0]?.providerId || 'email',
                });
              }
            } catch (e) {
              // Background create failed — not critical, will retry on next load
            }
          })();
        }

        const basicUser = buildBasicUser(firebaseUser);
        setUser(basicUser);
        registerSessionForUser(basicUser);
        return basicUser;
      }

      // ── Happy path: RTDB returned data ────────────────────────────────
      // New user — create RTDB record
      if (dbUser === null) {
        try {
          const email = firebaseUser.email?.toLowerCase();
          let username =
            firebaseUser.displayName
              ?.replace(/[^a-zA-Z0-9_]/g, '')
              .toLowerCase()
              .slice(0, 15) ||
            email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) ||
            'user_' + firebaseUser.uid.slice(0, 5);

          // Each availability check gets its own timeout — resolves `true`
          // (assume available) on timeout so we never block auth forever.
          let isAvailable = await withTimeout(
            checkUsernameAvailable(username), USERNAME_CHECK_MS, true
          );
          let counter = 1;
          while (!isAvailable && counter < 20) {
            username = `${username.slice(0, 12)}${counter}`;
            isAvailable = await withTimeout(
              checkUsernameAvailable(username), USERNAME_CHECK_MS, true
            );
            counter++;
          }
          dbUser = await createUser(firebaseUser.uid, {
            username,
            email,
            photo_url: firebaseUser.photoURL || '',
            auth_provider: firebaseUser.providerData[0]?.providerId || 'email',
          });
          window.localStorage.setItem('showWelcomeModal_' + firebaseUser.uid, 'true');
          sendWelcomeEmailDirectly(email, username);
          
          // Only send Telegram admin alert if NOT already sent by email registration flow
          // (email registration sets 'adminSignupNotified_<uid>' before calling notifyAdminUserSignup)
          const alreadyNotified = window.localStorage.getItem('adminSignupNotified_' + firebaseUser.uid);
          if (!alreadyNotified) {
            notifyAdminUserSignup(username, firebaseUser.uid, email).catch(err => console.warn('[Telegram Admin Alert failed]', err));
            window.localStorage.setItem('adminSignupNotified_' + firebaseUser.uid, 'true');
          }
        } catch (e) {
          console.error('[Auth] createUser error:', e);
          const basicUser = buildBasicUser(firebaseUser);
          setUser(basicUser);
          registerSessionForUser(basicUser);
          return basicUser;
        }
      }

      const userData = {
        id:            firebaseUser.uid,
        uid:           firebaseUser.uid,
        email:         dbUser.email || firebaseUser.email,
        username:      dbUser.username,
        photo_url:     dbUser.photo_url || firebaseUser.photoURL || '',
        verified:      dbUser.verified || false,
        admin_message: dbUser.admin_message || '',
        created_at:    dbUser.created_at,
      };

      setUser(userData);
      registerSessionForUser(userData);
      return userData;
    },
    [registerSessionForUser]
  );

  // ── Email link sign-in: runs once on mount ──────────────────────────────
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    if (!email) return;

    signInWithEmailLink(auth, email, window.location.href)
      .then(async (result) => {
        window.localStorage.removeItem('emailForSignIn');
        window.localStorage.removeItem('pendingVerification');
        window.localStorage.removeItem('pendingUsername');

        const storedUsername = window.localStorage.getItem(
          'verifyUsername_' + email.toLowerCase()
        );
        if (storedUsername) {
          try {
            const existing = await getUser(result.user.uid);
            if (!existing) {
              await createUser(result.user.uid, {
                username: storedUsername,
                email: email.toLowerCase(),
                photo_url: '',
                auth_provider: 'email',
              });
            }
          } catch {}
          window.localStorage.removeItem('verifyUsername_' + email.toLowerCase());
        }

        await syncUser(result.user);
        setPendingVerification(false);
      })
      .catch((err) => {
        console.error('[Auth] Email link sign-in error:', err);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core auth subscriber ────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe = null;
    // Guard against authReady resolving after this effect has been cleaned up
    // (e.g. in React StrictMode double-invoke or fast navigation away).
    let mounted = true;

    // Reset resolution guard for this mount
    hasResolved.current = false;

    // Hard timeout: if onAuthStateChanged never fires (network blocked),
    // we resolve as "no user" so the app never spins forever.
    hardTimeoutRef.current = setTimeout(() => {
      if (!hasResolved.current) {
        console.warn('[Auth] Hard timeout reached — resolving as unauthenticated.');
        setUser(null);
        resolve();
      }
    }, AUTH_TIMEOUT_MS);

    // Wait for persistence to be configured before subscribing.
    // authReady itself has a 3-second timeout (see firebase.js) so this
    // .then() always runs promptly even on restricted networks.
    authReady.then(() => {
      // If the component unmounted while we were waiting, bail out.
      if (!mounted) return;

      // Handle sign-in redirect (only in browser tab mode)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      if (!isStandalone) {
        withTimeout(getRedirectResult(auth), REDIRECT_RESULT_MS, null)
          .then(async (result) => {
            if (result?.user && mounted) {
              window.localStorage.removeItem('pendingVerification');
              setPendingVerification(false);
              await syncUser(result.user);
              resolve();
            }
          })
          .catch((err) => {
            // Non-critical — Google redirect just didn't happen
            console.warn('[Auth] getRedirectResult (non-critical):', err?.code || err?.message);
          });
      }

      // Subscribe to auth state
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;
        try {
          // ── Pending email verification: sign out password providers ──
          const isPending = window.localStorage.getItem('pendingVerification');
          if (
            isPending &&
            firebaseUser &&
            firebaseUser.providerData[0]?.providerId === 'password'
          ) {
            await firebaseSignOut(auth);
            if (!mounted) return;
            setUser(null);
            setPendingVerification(true);
            resolve();
            return;
          }

          // Clear stale pending flag for non-password providers
          if (firebaseUser && firebaseUser.providerData[0]?.providerId !== 'password') {
            window.localStorage.removeItem('pendingVerification');
            if (mounted) setPendingVerification(false);
          }

          await syncUser(firebaseUser);
        } catch (err) {
          console.error('[Auth] onAuthStateChanged handler error:', err);
          // Fail safe: if we errored and there's a firebase user, use basic data
          if (mounted) {
            if (firebaseUser) {
              setUser(buildBasicUser(firebaseUser));
            } else {
              setUser(null);
            }
          }
        } finally {
          if (mounted) resolve();
        }
      });
    });

    return () => {
      mounted = false;
      clearTimeout(hardTimeoutRef.current);
      hasResolved.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time RTDB profile listener: verification & account removal ─────
  useEffect(() => {
    if (!user?.id) return;

    const userRef = ref(database, `users/${user.id}`);
    let previousVerified = user.verified;
    let sawProfile = false;

    const handleUserUpdate = (snapshot) => {
      if (snapshot.exists()) {
        sawProfile = true;
        const data = snapshot.val();
        const newVerified = data.verified || false;

        if (previousVerified !== newVerified) {
          syncUserVerificationEverywhere(user.id, newVerified).catch(console.error);
          syncUserVerificationInCommentsFirestore(user.id, newVerified).catch(console.error);
          previousVerified = newVerified;
        }

        setUser((prev) => ({
          ...prev,
          verified:       newVerified,
          admin_message:  data.admin_message || '',
        }));
      } else if (sawProfile) {
        // Profile record was deleted → account removed by admin
        sawProfile = false;
        (async () => {
          try {
            await purgeUserSessionCaches(user.id);
            await firebaseSignOut(auth);
            setUser(null);
          } catch (e) {
            console.error('[Auth] Account removal cleanup error:', e);
          }
        })();
      }
    };

    const unsub = onValue(userRef, handleUserUpdate);
    return () => unsub();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time presence engine ───────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Database references
    const userRef = ref(database, `users/${user.id}`);
    const userPresenceRef = ref(database, `users/${user.id}/isOnline`);
    const userLastSeenRef = ref(database, `users/${user.id}/lastSeen`);

    // Primary DB onDisconnect handlers
    const primaryPresenceOnDisconnect = onDisconnect(userPresenceRef);
    const primaryLastSeenOnDisconnect = onDisconnect(userLastSeenRef);

    primaryPresenceOnDisconnect.set(false);
    primaryLastSeenOnDisconnect.set(Date.now());

    // Update immediately on load
    const updateOnline = () => {
      const now = Date.now();
      
      // Update primary user node
      const updates = {
        isOnline: true,
        lastSeen: now,
      };
      
      update(userRef, updates).catch(() => {});

      // If sixth db is available, synchronise presence
      if (isDevRadarDbAvailable()) {
        const sixthUserLocRef = ref(devRadarDatabase, `devRadarLocations/${user.id}`);
        // Read location node first to verify if it exists, to prevent creating empty location records
        get(sixthUserLocRef).then((snap) => {
          if (snap.exists()) {
            const sixthUpdates = {
              isOnline: true,
              lastSeen: now,
            };
            update(sixthUserLocRef, sixthUpdates).catch(() => {});
            
            // Set up onDisconnect for sixth db too
            const sixthPresenceRef = ref(devRadarDatabase, `devRadarLocations/${user.id}/isOnline`);
            const sixthLastSeenRef = ref(devRadarDatabase, `devRadarLocations/${user.id}/lastSeen`);
            
            const sixthPresenceOnDisconnect = onDisconnect(sixthPresenceRef);
            const sixthLastSeenOnDisconnect = onDisconnect(sixthLastSeenRef);
            
            sixthPresenceOnDisconnect.set(false);
            sixthLastSeenOnDisconnect.set(Date.now());
          }
        }).catch(() => {});
      }
    };

    updateOnline();

    // Heartbeat every 10 seconds
    const interval = setInterval(updateOnline, 10000);

    return () => {
      clearInterval(interval);
      primaryPresenceOnDisconnect.cancel();
      primaryLastSeenOnDisconnect.cancel();
      
      // Set to offline when unmounting (logging out / session expired)
      update(userRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});
      
      if (isDevRadarDbAvailable()) {
        const sixthUserLocRef = ref(devRadarDatabase, `devRadarLocations/${user.id}`);
        get(sixthUserLocRef).then((snap) => {
          if (snap.exists()) {
            update(sixthUserLocRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});
          }
        }).catch(() => {});
      }
    };
  }, [user?.id]);

  // ── Auth methods ────────────────────────────────────────────────────────

  const register = async (username, email, password) => {
    try {
      if (!username || username.length < 2)
        return { success: false, error: 'Username must be at least 2 characters' };
      if (!/^[a-zA-Z0-9_]+$/.test(username))
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
      if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
        return { success: false, error: 'Please enter a valid email address' };
      if (!password || password.length < 6)
        return { success: false, error: 'Password must be at least 6 characters' };

      const isAvailable = await checkUsernameAvailable(username);
      if (!isAvailable)
        return { success: false, error: `Username "${username}" is already taken` };

      const existingUser = await getUserByEmail(email);
      if (existingUser)
        return { success: false, error: 'This email is already registered' };

      // Fix for Username Race Condition: Set pending flags BEFORE Firebase Auth triggers onAuthStateChanged
      window.localStorage.setItem('pendingVerification', 'true');
      window.localStorage.setItem('verifyUsername_' + email.toLowerCase().trim(), username.trim());
      window.localStorage.setItem('emailForSignIn', email);

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      await createUser(credential.user.uid, {
        username: username.trim(),
        email:    email.toLowerCase().trim(),
        photo_url: '',
        auth_provider: 'email',
      });
      window.localStorage.setItem('showWelcomeModal_' + credential.user.uid, 'true');
      
      // Trigger the welcome email immediately upon successful registration
      sendWelcomeEmailDirectly(email.toLowerCase().trim(), username.trim());
      
      // Trigger Telegram notification to Admin (set flag first to prevent duplicate from onAuthStateChanged/syncUser)
      window.localStorage.setItem('adminSignupNotified_' + credential.user.uid, 'true');
      notifyAdminUserSignup(username.trim(), credential.user.uid, email.toLowerCase().trim()).catch(err => console.warn('[Telegram Admin Alert failed]', err));

      await sendSignInLinkToEmail(auth, email, {
        url: EMAIL_LINK_REDIRECT_URL,
        handleCodeInApp: true,
      });

      await firebaseSignOut(auth);
      setUser(null);
      setPendingVerification(true);

      return { success: true, needsVerification: true };
    } catch (error) {
      window.localStorage.removeItem('pendingVerification'); // Cleanup on failure
      console.error('[Auth] Registration error:', error);
      if (error.code === 'auth/email-already-in-use')
        return { success: false, error: 'This email is already registered' };
      if (error.code === 'auth/weak-password')
        return { success: false, error: 'Password is too weak' };
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const login = async (email, password) => {
    try {
      if (!email)    return { success: false, error: 'Email is required' };
      if (!password) return { success: false, error: 'Password is required' };

      window.localStorage.removeItem('pendingVerification');

      const credential = await signInWithEmailAndPassword(auth, email, password);
      await syncUser(credential.user);
      setPendingVerification(false);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      if (error.code === 'auth/user-not-found')
        return { success: false, error: 'No account found with this email' };
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
        return { success: false, error: 'Incorrect password' };
      if (error.code === 'auth/invalid-email')
        return { success: false, error: 'Invalid email address' };
      if (error.code === 'auth/too-many-requests')
        return { success: false, error: 'Too many attempts. Please try again later.' };
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      window.localStorage.removeItem('pendingVerification');
      setPendingVerification(false);

      try {
        const result = await signInWithPopup(auth, googleProvider);
        await syncUser(result.user);
        return { success: true };
      } catch (popupError) {
        const code = popupError.code || '';

        if (code === 'auth/unauthorized-domain') {
          return {
            success: false,
            error: `Add "${window.location.hostname}" to Firebase Console → Authentication → Authorized domains`,
          };
        }
        if (code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
          return { success: false, error: '' };
        }
        if (code === 'auth/popup-closed-by-user')
          return { success: false, error: 'Sign-in popup was closed' };
        if (code === 'auth/cancelled-popup-request')
          return { success: false, error: '' };

        throw popupError;
      }
    } catch (error) {
      console.error('[Auth] Google auth error:', error);
      return { success: false, error: error.message || 'Google sign-in failed' };
    }
  };

  const resendVerificationEmail = async (email) => {
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: EMAIL_LINK_REDIRECT_URL,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Resend verification error:', error);
      return { success: false, error: error.message || 'Failed to resend verification email' };
    }
  };

  const logout = async () => {
    try {
      window.localStorage.removeItem('pendingVerification');
      window.localStorage.removeItem('emailForSignIn');
      setPendingVerification(false);

      const uid = auth.currentUser?.uid;
      if (uid) {
        // Clean up session record
        if (sessionCleanupRef.current) {
          await sessionCleanupRef.current();
          sessionCleanupRef.current = null;
        }
        await purgeUserSessionCaches(uid);
      }

      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await syncUser(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        pendingVerification,
        login,
        register,
        loginWithGoogle,
        logout,
        resendVerificationEmail,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
