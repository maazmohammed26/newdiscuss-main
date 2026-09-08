import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getAuthenticatedIdToken } from './authenticatedRequest';
import { secondaryApp } from './firebaseSecondary';
import { thirdApp } from './firebaseThird';
import { fourthApp } from './firebaseFourth';
import { fifthApp } from './firebaseFifth';
import { devRadarApp } from './firebaseSixth';

const TARGETS = [
  ['secondary', secondaryApp],
  ['chats', thirdApp],
  ['groups', fourthApp],
  ['stories', fifthApp],
  ['devradar', devRadarApp],
];

let activeUid = null;
let synchronization = null;

// Cooldown tracker to prevent uncontrolled 503 retry bursts
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const projectCooldowns = new Map();

export const resetAuxiliaryCooldowns = () => {
  projectCooldowns.clear();
};

const requestCustomToken = async (project) => {
  const cooldownUntil = projectCooldowns.get(project);
  if (cooldownUntil && Date.now() < cooldownUntil) {
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
    if (response.status === 503 || result.code === 'aux-auth-not-configured' || result.code === 'project-auth-not-configured') {
      projectCooldowns.set(project, Date.now() + COOLDOWN_DURATION_MS);
    }
    throw new Error(result.code || `aux-auth-${response.status}`);
  }
  projectCooldowns.delete(project);
  return result.token;
};

export const synchronizeAuxiliaryAuth = async (uid) => {
  if (!uid) return [];
  if (activeUid === uid && synchronization) return synchronization;
  activeUid = uid;
  synchronization = Promise.allSettled(TARGETS.filter(([, app]) => Boolean(app)).map(async ([project, app]) => {
    const auth = getAuth(app);
    if (auth.currentUser?.uid === uid) return { project, reused: true };
    const token = await requestCustomToken(project);
    const credential = await signInWithCustomToken(auth, token);
    if (credential.user.uid !== uid) throw new Error('aux-auth-uid-mismatch');
    return { project, uid };
  }));
  const results = await synchronization;
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) console.warn(`[AUTH] ${failures.length} auxiliary Firebase authentication target(s) unavailable.`);
  return results;
};

export const signOutAuxiliaryAuth = async () => {
  activeUid = null;
  synchronization = null;
  await Promise.allSettled(TARGETS.filter(([, app]) => Boolean(app)).map(([, app]) => {
    const auth = getAuth(app);
    return auth.currentUser ? signOut(auth) : Promise.resolve();
  }));
};
