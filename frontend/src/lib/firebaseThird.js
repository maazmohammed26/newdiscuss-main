// Third Firebase Project - Realtime Database for Chats
// This project stores: Messages, Chat metadata, Chat status
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

// Third Firebase configuration (discuss-f1f56) - CHATS
const thirdFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_THIRD_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_THIRD_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_THIRD_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_THIRD_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_THIRD_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_THIRD_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_THIRD_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_THIRD_MEASUREMENT_ID
};

// Initialize third app with unique name
let thirdApp = null;
let thirdDatabase = null;
let initError = null;

try {
  thirdApp = getApps().find(app => app.name === 'chatDb') 
    || initializeApp(thirdFirebaseConfig, 'chatDb');
  
  // Get Realtime Database instance from third app
  thirdDatabase = getDatabase(thirdApp);
} catch (error) {
  console.warn('Failed to initialize third Firebase:', error.message);
  initError = error;
}

// Helper to check if third database is available
export const isThirdDbAvailable = () => {
  return thirdDatabase !== null && initError === null;
};

export { 
  thirdApp,
  thirdDatabase,
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

export default thirdApp;
