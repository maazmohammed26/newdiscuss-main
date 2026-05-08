// Fifth Firebase Project — Realtime Database for Signal Stories
// Project: discuss-d48be
// Data stored: stories/, storyViews/
// Shares the same Auth UID as primary Firebase for seamless identity sync.

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
  startAt,
  limitToLast,
  serverTimestamp,
} from 'firebase/database';

const fifthProjectId =
  process.env.REACT_APP_FIREBASE_FIFTH_PROJECT_ID || 'discuss-d48be';

const fifthFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_FIFTH_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_FIFTH_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_FIFTH_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_FIFTH_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_FIFTH_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_FIFTH_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_FIFTH_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_FIFTH_MEASUREMENT_ID,
};

let fifthApp = null;
let fifthDatabase = null;
let initError = null;

try {
  fifthApp =
    getApps().find((app) => app.name === 'signalDb') ||
    initializeApp(fifthFirebaseConfig, 'signalDb');
  fifthDatabase = getDatabase(fifthApp);
} catch (error) {
  console.warn('Failed to initialize fifth Firebase (Signal):', error.message);
  initError = error;
}

export const isFifthDbAvailable = () =>
  fifthDatabase !== null && initError === null;

export {
  fifthApp,
  fifthDatabase,
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
  startAt,
  limitToLast,
  serverTimestamp,
};

export default fifthApp;
