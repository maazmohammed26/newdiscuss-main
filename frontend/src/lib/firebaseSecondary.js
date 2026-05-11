// Secondary Firebase Project - Realtime Database for new features
// This project stores: Comments, User Profiles (fullName, bio, socialLinks)
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
  equalTo
} from 'firebase/database';


// Secondary Firebase configuration (discussit-5879b) - NEW
const secondaryFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_SECONDARY_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_SECONDARY_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_SECONDARY_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_SECONDARY_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_SECONDARY_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SECONDARY_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_SECONDARY_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_SECONDARY_MEASUREMENT_ID
};

// Initialize secondary app with unique name
let secondaryApp = null;
let secondaryDatabase = null;
let initError = null;

try {
  secondaryApp = getApps().find(app => app.name === 'secondary') 
    || initializeApp(secondaryFirebaseConfig, 'secondary');
  
  // Get Realtime Database instance from secondary app
  secondaryDatabase = getDatabase(secondaryApp);
} catch (error) {
  console.warn('Failed to initialize secondary Firebase:', error.message);
  initError = error;
}

// Helper to check if secondary database is available
export const isSecondaryDbAvailable = () => {
  return secondaryDatabase !== null && initError === null;
};

export { 
  secondaryApp,
  secondaryDatabase,
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
  equalTo
};


export default secondaryApp;
