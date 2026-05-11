/**
 * Security Service for App Lock and Biometrics
 * Synchronized via Firebase Secondary Database
 */
import { secondaryDatabase, ref, get, set, update, remove } from './firebaseSecondary';

const LOCK_SETTINGS_KEY = 'discuss_security_settings';
const LAST_UNLOCKED_KEY = 'discuss_last_unlocked';
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get local settings (Biometrics remain local to device)
 */
export const getLocalSecuritySettings = () => {
  try {
    const saved = localStorage.getItem(LOCK_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : { enabled: false, type: 'none' };
  } catch {
    return { enabled: false, type: 'none' };
  }
};

/**
 * Save local settings
 */
export const saveLocalSecuritySettings = (settings) => {
  localStorage.setItem(LOCK_SETTINGS_KEY, JSON.stringify(settings));
};

/**
 * Get synchronized PIN and Lockout status from DB
 */
export const getRemoteSecurityData = async (userId) => {
  if (!userId) return null;
  try {
    const securityRef = ref(secondaryDatabase, `userSecurity/${userId}`);
    const snapshot = await get(securityRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting remote security data:', error);
    return null;
  }
};

/**
 * Save PIN to DB — uses update() so we don't wipe failedAttempts/lockoutUntil
 */
export const saveRemotePin = async (userId, pin) => {
  if (!userId) throw new Error('userId is required');
  if (!secondaryDatabase) throw new Error('Secondary database not available');
  const securityRef = ref(secondaryDatabase, `userSecurity/${userId}`);
  await update(securityRef, {
    pin,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Remove PIN from DB (when user disables app lock)
 */
export const removeRemotePin = async (userId) => {
  if (!userId) return;
  if (!secondaryDatabase) return;
  try {
    const securityRef = ref(secondaryDatabase, `userSecurity/${userId}`);
    await remove(securityRef);
  } catch (error) {
    console.error('Error removing remote PIN:', error);
  }
};

/**
 * Handle failed attempt and check for lockout
 */
export const registerFailedAttempt = async (userId) => {
  if (!userId) return;
  const securityRef = ref(secondaryDatabase, `userSecurity/${userId}`);
  const data = await getRemoteSecurityData(userId);
  const attempts = (data?.failedAttempts || 0) + 1;

  const updates = { failedAttempts: attempts };

  if (attempts >= MAX_ATTEMPTS) {
    updates.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    updates.failedAttempts = 0;
  }

  await update(securityRef, updates);
  return updates.lockoutUntil || null;
};

/**
 * Reset failed attempts on successful unlock
 */
export const resetFailedAttempts = async (userId) => {
  if (!userId) return;
  const securityRef = ref(secondaryDatabase, `userSecurity/${userId}`);
  await update(securityRef, { failedAttempts: 0, lockoutUntil: null });
};

export const setLastUnlocked = () => {
  localStorage.setItem(LAST_UNLOCKED_KEY, Date.now().toString());
};

/**
 * Smart Lock Logic: Only lock if timeout exceeded (5 minutes)
 */
export const shouldLock = () => {
  const local = getLocalSecuritySettings();
  if (!local.enabled) return false;

  const lastUnlocked = localStorage.getItem(LAST_UNLOCKED_KEY);
  if (!lastUnlocked) return true;

  const elapsed = Date.now() - parseInt(lastUnlocked);
  return elapsed > LOCK_TIMEOUT;
};

/**
 * Check if Biometrics (WebAuthn) is supported
 */
export const isBiometricSupported = async () => {
  return (
    window.PublicKeyCredential &&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  );
};

/**
 * Register Biometrics
 */
export const registerBiometric = async (username) => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userID = new Uint8Array(16);
    window.crypto.getRandomValues(userID);

    const publicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: "Discuss", id: window.location.hostname },
      user: { id: userID, name: username, displayName: username },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
    return !!credential;
  } catch (err) {
    console.error('Biometric registration failed:', err);
    return false;
  }
};

/**
 * Verify Biometrics
 */
export const verifyBiometric = async () => {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const publicKeyCredentialRequestOptions = { challenge, allowCredentials: [], userVerification: "required", timeout: 60000 };
    const assertion = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });
    return !!assertion;
  } catch (err) {
    console.error('Biometric verification failed:', err);
    return false;
  }
};
