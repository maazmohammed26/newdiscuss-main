/**
 * Security Service for App Lock and Biometrics
 */

const LOCK_SETTINGS_KEY = 'discuss_security_settings';
const LAST_UNLOCKED_KEY = 'discuss_last_unlocked';
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const getSecuritySettings = () => {
  const saved = localStorage.getItem(LOCK_SETTINGS_KEY);
  return saved ? JSON.parse(saved) : { enabled: false, type: 'none', pin: null };
};

export const saveSecuritySettings = (settings) => {
  localStorage.setItem(LOCK_SETTINGS_KEY, JSON.stringify(settings));
};

export const setLastUnlocked = () => {
  localStorage.setItem(LAST_UNLOCKED_KEY, Date.now().toString());
};

export const shouldLock = () => {
  const settings = getSecuritySettings();
  if (!settings.enabled) return false;

  const lastUnlocked = localStorage.getItem(LAST_UNLOCKED_KEY);
  if (!lastUnlocked) return true;

  const elapsed = Date.now() - parseInt(lastUnlocked);
  return elapsed > LOCK_TIMEOUT;
};

/**
 * Check if Biometrics (WebAuthn) is supported on this device
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
      user: {
        id: userID,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

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

    const publicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [],
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    return !!assertion;
  } catch (err) {
    console.error('Biometric verification failed:', err);
    return false;
  }
};
