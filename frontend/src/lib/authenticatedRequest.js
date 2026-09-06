import { auth, authReady, onAuthStateChanged } from './firebase';

const DEFAULT_AUTH_WAIT_MS = 8_000;

/**
 * Firebase can restore its persisted user after React has already hydrated the
 * cached Discuss profile. Protected API calls must wait for that restoration
 * instead of treating the temporary `auth.currentUser === null` as logout.
 */
export const waitForAuthenticatedUser = async (timeoutMs = DEFAULT_AUTH_WAIT_MS) => {
  const startedAt = Date.now();
  await authReady.catch(() => auth);
  if (auth.currentUser) return auth.currentUser;

  if (typeof auth.authStateReady === 'function') {
    await Promise.race([
      auth.authStateReady().catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
    ]);
    if (auth.currentUser) return auth.currentUser;
  }

  const remainingMs = Math.max(0, timeoutMs - (Date.now() - startedAt));
  if (remainingMs === 0) return null;

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    const finish = (user) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(user || null);
    };
    const timer = window.setTimeout(() => finish(null), remainingMs);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) finish(user);
    }, () => finish(null));
    if (settled) unsubscribe();
  });
};

export const getAuthenticatedIdToken = async ({ forceRefresh = false, timeoutMs } = {}) => {
  const user = await waitForAuthenticatedUser(timeoutMs);
  if (!user) {
    const error = new Error('Your secure session is still restoring. Please retry in a moment.');
    error.code = 'auth-session-unavailable';
    throw error;
  }
  return user.getIdToken(forceRefresh);
};
