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
  apiKey: "AIzaSyApaW1wrzyMho7NKV8ygDnK_Dgrw6j5IUM",
  authDomain: "discuss-f1f56.firebaseapp.com",
  databaseURL: "https://discuss-f1f56-default-rtdb.firebaseio.com",
  projectId: "discuss-f1f56",
  storageBucket: "discuss-f1f56.firebasestorage.app",
  messagingSenderId: "915898650329",
  appId: "1:915898650329:web:9d0caa0e9413e3fb8738c8",
  measurementId: "G-905BC34G86"
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
  console.log('Third Firebase (Chats) initialized successfully');
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
