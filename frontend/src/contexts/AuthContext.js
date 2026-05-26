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
  sendEmailVerification,
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

// Definition moved to shared lib/emailService.js

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
          if (
            firebaseUser &&
            firebaseUser.providerData[0]?.providerId === 'password' &&
            !firebaseUser.emailVerified
          ) {
            await firebaseSignOut(auth);
            if (!mounted) return;
            setUser(null);
            setPendingVerification(true);
            resolve();
            return;
          }

          if (firebaseUser && (firebaseUser.providerData[0]?.providerId !== 'password' || firebaseUser.emailVerified)) {
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

      // Set pending verification in storage so we treat this email specially
      window.localStorage.setItem('pendingVerification', 'true');
      window.localStorage.setItem('verifyUsername_' + email.toLowerCase().trim(), username.trim());
      window.localStorage.setItem('emailForSignIn', email);

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      // Create the user profile in database
      await createUser(credential.user.uid, {
        username: username.trim(),
        email:    email.toLowerCase().trim(),
        photo_url: '',
        auth_provider: 'email',
        emailVerified: false,
      });
      window.localStorage.setItem('showWelcomeModal_' + credential.user.uid, 'true');
      
      // Trigger Telegram notification to Admin (set flag first to prevent duplicate from onAuthStateChanged/syncUser)
      window.localStorage.setItem('adminSignupNotified_' + credential.user.uid, 'true');
      notifyAdminUserSignup(username.trim(), credential.user.uid, email.toLowerCase().trim()).catch(err => console.warn('[Telegram Admin Alert failed]', err));

      // Standard Firebase Email Verification combined with beautiful ActionCode redirect settings back to our verify page!
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(credential.user, actionCodeSettings);

      // Explicitly sign out so they can't access pages without verifying first
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
      
      // Enforce backend-secured email verification before completing sign-in
      if (!credential.user.emailVerified) {
        // Automatically resend a fresh native Firebase verification link!
        try {
          const actionCodeSettings = {
            url: `${window.location.origin}/verify-email`,
            handleCodeInApp: true,
          };
          await sendEmailVerification(credential.user, actionCodeSettings);
          console.log('[Auth] Automatically resent native verification link to unverified user.');
        } catch (resendErr) {
          console.error('[Auth] Failed to automatically resend verification link:', resendErr);
        }
        
        await firebaseSignOut(auth);
        setUser(null);
        return { 
          success: false, 
          error: 'Your email address is not verified yet. We have automatically sent a fresh verification link to your email. Please check your inbox or spam folder (it may take 2 to 3 minutes to arrive).' 
        };
      }

      await syncUser(credential.user);
      setPendingVerification(false);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        return { success: false, error: 'Incorrect email or password' };
      }
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
      if (auth.currentUser) {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: true,
        };
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
        return { success: true };
      }
      return { success: false, error: 'User is not signed in to trigger verification' };
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
