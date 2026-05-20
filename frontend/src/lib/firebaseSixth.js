// Sixth Firebase Project - Realtime Database for DevRadar location mapping
// Project: discuss-74b96
// Stores: devRadarLocations/
// Shares the same Auth UID as primary Firebase for identity sync.

import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  update,
} from 'firebase/database';

const devRadarFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_SIXTH_API_KEY || "AIzaSyCOciSaaICIG4HMAqEsOrf4mOwAushElxA",
  authDomain: process.env.REACT_APP_FIREBASE_SIXTH_AUTH_DOMAIN || "discuss-74b96.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_SIXTH_PROJECT_ID || "discuss-74b96",
  storageBucket: process.env.REACT_APP_FIREBASE_SIXTH_STORAGE_BUCKET || "discuss-74b96.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_SIXTH_MESSAGING_SENDER_ID || "304133238966",
  appId: process.env.REACT_APP_FIREBASE_SIXTH_APP_ID || "1:304133238966:web:0dd299389f3a62aceb7617",
  measurementId: process.env.REACT_APP_FIREBASE_SIXTH_MEASUREMENT_ID || "G-656SKYHN58",
  databaseURL: process.env.REACT_APP_FIREBASE_SIXTH_DATABASE_URL || "https://discuss-74b96-default-rtdb.firebaseio.com"
};

let devRadarApp = null;
let devRadarDatabase = null;
let initError = null;

try {
  devRadarApp =
    getApps().find((app) => app.name === 'devRadarDb') ||
    initializeApp(devRadarFirebaseConfig, 'devRadarDb');
  devRadarDatabase = getDatabase(devRadarApp);
} catch (error) {
  console.warn('Failed to initialize sixth Firebase (DevRadar):', error.message);
  initError = error;
}

export const isDevRadarDbAvailable = () =>
  devRadarDatabase !== null && initError === null;

// CRUD utility functions for DevRadar Locations
export const saveUserLocation = async (userId, locationData) => {
  if (!isDevRadarDbAvailable()) return null;
  const locationRef = ref(devRadarDatabase, `devRadarLocations/${userId}`);
  const dataToSave = {
    ...locationData,
    lastUpdated: new Date().toISOString()
  };
  await set(locationRef, dataToSave);
  return dataToSave;
};

export const deleteUserLocation = async (userId) => {
  if (!isDevRadarDbAvailable()) return null;
  const locationRef = ref(devRadarDatabase, `devRadarLocations/${userId}`);
  await remove(locationRef);
  return true;
};

export const getUserLocation = async (userId) => {
  if (!isDevRadarDbAvailable()) return null;
  const locationRef = ref(devRadarDatabase, `devRadarLocations/${userId}`);
  const snap = await get(locationRef);
  return snap.exists() ? snap.val() : null;
};

export const subscribeToPublicLocations = (callback) => {
  if (!isDevRadarDbAvailable()) {
    callback([]);
    return () => {};
  }
  const locationsRef = ref(devRadarDatabase, 'devRadarLocations');
  const handleLocations = (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.entries(data)
      .map(([userId, loc]) => ({ userId, ...loc }))
      .filter((loc) => loc.isPublic === true);
    callback(list);
  };
  onValue(locationsRef, handleLocations);
  return () => off(locationsRef);
};

export {
  devRadarApp,
  devRadarDatabase,
  ref,
  get,
  set,
  remove,
  onValue,
  off,
  update,
};

export default devRadarApp;
