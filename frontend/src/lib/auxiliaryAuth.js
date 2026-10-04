import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getAuthenticatedIdToken } from './authenticatedRequest';
import { doesProjectRequireCustomTokenAuth } from './firebaseRegistry';
import { secondaryApp } from './firebaseSecondary';
import { thirdApp } from './firebaseThird';
import { fourthApp } from './firebaseFourth';
import { fifthApp } from './firebaseFifth';
import { devRadarApp } from './firebaseSixth';

const TARGET_APPS = [
  ['secondary', secondaryApp],
  ['chats', thirdApp],
  ['groups', fourthApp],
  ['stories', fifthApp],
  ['devradar', devRadarApp],
];

let activeUid = null;
let synchronizationPromise = null;

// Bounded backoff circuit breaker tracker
const INITIAL_COOLDOWN_MS = 5 * 1000; // 5 seconds initial backoff
const MAX_COOLDOWN_MS = 60 * 1000; // 60 seconds maximum bounded backoff
let failureCount = 0;
let globalCooldownUntil = 0;
let hasLoggedCooldownNotice = false;

export const resetAuxiliaryCooldowns = () => {
  failureCount = 0;
  globalCooldownUntil = 0;
  hasLoggedCooldownNotice = false;
  synchronizationPromise = null;
  activeUid = null;
};

// Automatically reset circuit breaker when browser regains network connectivity
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    resetAuxiliaryCooldowns();
  });
}

export const isAuxiliaryCircuitBreakerOpen = () => {
  return Boolean(globalCooldownUntil && Date.now() < globalCooldownUntil);
};

const requestCustomToken = async (project) => {
  if (isAuxiliaryCircuitBreakerOpen()) {
    throw new Error('aux-auth-in-cooldown');
  }

  const idToken = await getAuthenticatedIdToken();
  const response = await fetch('/api/aux-auth-token', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ project }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.token) {
    // If backend is unavailable or unconfigured, engage bounded backoff circuit breaker
    if (
      response.status === 503 ||
      result.code === 'aux-auth-not-configured' ||
      result.code === 'project-auth-not-configured' ||
      result.code === 'AUX_CONFIG_MISSING' ||
      result.code === 'AUX_CONFIG_INVALID_JSON' ||
      result.code === 'AUX_SERVICE_ACCOUNT_INVALID'
    ) {
      failureCount += 1;
      const delayMs = Math.min(INITIAL_COOLDOWN_MS * Math.pow(2, failureCount - 1), MAX_COOLDOWN_MS);
      globalCooldownUntil = Date.now() + delayMs;
      if (!hasLoggedCooldownNotice) {
        hasLoggedCooldownNotice = true;
        console.warn(`[AUTH] Auxiliary Firebase auth backend unavailable. Bounded ${Math.round(delayMs / 1000)}s backoff engaged.`);
      }
    }
    throw new Error(result.code || `aux-auth-${response.status}`);
  }

  // Reset backoff immediately upon success
  failureCount = 0;
  globalCooldownUntil = 0;
  hasLoggedCooldownNotice = false;

  return result.token;
};

/**
 * Coordinates auxiliary Firebase authentication across targets.
 * Ensures:
 *  1. Only targets requiring custom-token authentication for RTDB security rules are processed.
 *  2. Multiple concurrent callers share a single in-flight synchronization promise.
 *  3. A global circuit breaker prevents repeated 503 request storms on startup.
 */
export const synchronizeAuxiliaryAuth = async (uid) => {
  if (!uid) return [];

  // Filter initialized apps that require custom-token authentication
  const authRequiredTargets = TARGET_APPS.filter(([project, app]) => {
    return Boolean(app) && doesProjectRequireCustomTokenAuth(project);
  });

  // If no auxiliary apps require browser auth (they are database-only), resolve immediately
  if (authRequiredTargets.length === 0) {
    return [];
  }

  // If global circuit breaker is active, skip outbound requests
  if (isAuxiliaryCircuitBreakerOpen()) {
    return [];
  }

  // Deduplicate in-flight requests: share single active synchronization coordinator
  if (activeUid === uid && synchronizationPromise) {
    return synchronizationPromise;
  }

  activeUid = uid;
  hasLoggedCooldownNotice = false;

  synchronizationPromise = (async () => {
    const results = [];

    for (const [project, app] of authRequiredTargets) {
      if (isAuxiliaryCircuitBreakerOpen()) {
        results.push({ status: 'rejected', reason: new Error('aux-auth-in-cooldown') });
        continue;
      }

      try {
        const auth = getAuth(app);
        if (auth?.currentUser?.uid === uid) {
          results.push({ status: 'fulfilled', value: { project, reused: true } });
          continue;
        }

        const token = await requestCustomToken(project);
        const credential = await signInWithCustomToken(auth, token);
        if (credential.user.uid !== uid) {
          throw new Error('aux-auth-uid-mismatch');
        }

        results.push({ status: 'fulfilled', value: { project, uid } });
      } catch (err) {
        results.push({ status: 'rejected', reason: err });
      }
    }

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0 && !hasLoggedCooldownNotice) {
      hasLoggedCooldownNotice = true;
      console.warn(`[AUTH] ${failures.length} auxiliary Firebase authentication target(s) unavailable.`);
    }

    return results;
  })().finally(() => {
    synchronizationPromise = null;
  });

  return synchronizationPromise;
};

export const signOutAuxiliaryAuth = async () => {
  activeUid = null;
  synchronizationPromise = null;
  resetAuxiliaryCooldowns();

  const authRequiredTargets = TARGET_APPS.filter(([project, app]) => {
    return Boolean(app) && doesProjectRequireCustomTokenAuth(project);
  });

  await Promise.allSettled(
    authRequiredTargets.map(([, app]) => {
      try {
        const auth = getAuth(app);
        return auth.currentUser ? signOut(auth) : Promise.resolve();
      } catch (_) {
        return Promise.resolve();
      }
    })
  );
};
