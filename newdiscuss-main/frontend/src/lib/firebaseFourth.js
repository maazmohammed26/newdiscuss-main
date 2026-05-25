// Fourth Firebase Project - Realtime Database for Group Chats
// This project stores: Groups, Group Messages, Join Requests, Group Members
// Shares the same Auth UID with primary Firebase for sync

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
  equalTo,
  limitToLast,
  serverTimestamp
} from 'firebase/database';

const fourthProjectId =
  process.env.REACT_APP_FIREBASE_FOURTH_PROJECT_ID || 'discuss-3c060';

// Fourth Firebase (group chats + RTDB). Env overrides; sensible defaults for project/URL only.
const fourthFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_FOURTH_API_KEY,
  authDomain:
    process.env.REACT_APP_FIREBASE_FOURTH_AUTH_DOMAIN ||
    `${fourthProjectId}.firebaseapp.com`,
  databaseURL:
    process.env.REACT_APP_FIREBASE_FOURTH_DATABASE_URL ||
    `https://${fourthProjectId}-default-rtdb.firebaseio.com`,
  projectId: fourthProjectId,
  storageBucket:
    process.env.REACT_APP_FIREBASE_FOURTH_STORAGE_BUCKET ||
    `${fourthProjectId}.firebasestorage.app`,
  messagingSenderId: process.env.REACT_APP_FIREBASE_FOURTH_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_FOURTH_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_FOURTH_MEASUREMENT_ID,
};

// Initialize fourth app only when API key is set (avoids runtime init errors / blank app)
let fourthApp = null;
let fourthDatabase = null;
let initError = null;

const fourthApiKey =
  typeof fourthFirebaseConfig.apiKey === 'string'
    ? fourthFirebaseConfig.apiKey.trim()
    : '';

if (!fourthApiKey) {
  initError = new Error('REACT_APP_FIREBASE_FOURTH_API_KEY is not set');
  console.warn(
    'Fourth Firebase (groups) skipped: set REACT_APP_FIREBASE_FOURTH_* in frontend/.env'
  );
} else {
  try {
    fourthApp =
      getApps().find((app) => app.name === 'groupChatDb') ||
      initializeApp(fourthFirebaseConfig, 'groupChatDb');

    fourthDatabase = getDatabase(fourthApp);
    console.log('Fourth Firebase (Group Chats) initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize fourth Firebase:', error.message);
    initError = error;
  }
}

// Helper to check if fourth database is available
export const isFourthDbAvailable = () => {
  return fourthDatabase !== null && initError === null;
};

export { 
  fourthApp,
  fourthDatabase,
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
  equalTo,
  limitToLast,
  serverTimestamp
};

export default fourthApp;
