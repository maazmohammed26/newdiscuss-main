import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
} from 'firebase/database';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  browserLocalPersistence,
  setPersistence,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';


const getAuthDomain = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Localhost, local IPs, and private networks should keep using the default firebaseapp authDomain
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168.')) {
      return hostname;
    }
  }
  return process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
};

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// ── Initialize app (singleton) ─────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── authReady: resolves once persistence is set ────────────────────────────
// Any code that reads auth state should await this first so that the
// persistence layer (IndexedDB) is wired up before onAuthStateChanged fires.
//
// A 3-second timeout races against setPersistence so that restricted networks
// (corporate firewalls, ISP filtering, etc.) that block IndexedDB or Firebase
// cannot hang the app indefinitely — we fall back to default persistence and
// let the auth flow proceed.
const _setPersistencePromise = setPersistence(auth, browserLocalPersistence)
  .then(() => auth)
  .catch((e) => {
    console.warn('[Auth] setPersistence failed (non-critical):', e?.code);
    return auth; // Continue with default persistence on error
  });

export const authReady = Promise.race([
  _setPersistencePromise,
  new Promise((resolve) => setTimeout(() => resolve(auth), 5000)), // 5s silent fallback
]);

export {
  app,
  database,
  auth,
  googleProvider,
  ref,
  get,
  set,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  browserLocalPersistence,
  setPersistence,
  sendEmailVerification,
  applyActionCode,
  checkActionCode,
};

export default app;
