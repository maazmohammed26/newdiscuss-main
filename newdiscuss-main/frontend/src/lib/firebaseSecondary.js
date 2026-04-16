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
  apiKey: "AIzaSyBPVZQ7HLr9-t4EZJVA_yD8L-rrhdIIMS0",
  authDomain: "discussit-5879b.firebaseapp.com",
  databaseURL: "https://discussit-5879b-default-rtdb.firebaseio.com",
  projectId: "discussit-5879b",
  storageBucket: "discussit-5879b.firebasestorage.app",
  messagingSenderId: "1039827441866",
  appId: "1:1039827441866:web:c1c89d9950920405203c33",
  measurementId: "G-901N14JGG5"
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
