/**
 * firebaseRegistry.js — Centralized Firebase Project Capabilities Map
 *
 * Defines explicit capabilities per project instance:
 *  - database: true if Realtime Database is used
 *  - interactiveOAuth: true ONLY for primary project where users sign in via Google OAuth popups/redirects
 *  - customTokenAuth: true for auxiliary projects whose RTDB security rules require auth != null
 *                     via the /api/aux-auth-token minting bridge
 *  - storage: true if Firebase Storage bucket is used
 */

export const FIREBASE_PROJECT_CAPABILITIES = {
  primary: {
    alias: 'primary',
    appName: '[DEFAULT]',
    description: 'Primary platform identity, core feeds, notifications, and media storage',
    database: true,
    interactiveOAuth: true,
    customTokenAuth: false,
    storage: true,
    projectIdEnv: 'REACT_APP_FIREBASE_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_DATABASE_URL',
  },
  secondary: {
    alias: 'secondary',
    appName: 'secondary',
    description: 'Secondary RTDB: Comments and Extended Profiles',
    database: true,
    interactiveOAuth: false,
    customTokenAuth: true,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_SECONDARY_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_SECONDARY_DATABASE_URL',
  },
  chats: {
    alias: 'chats',
    appName: 'chatDb',
    description: 'Third RTDB: Direct 1-to-1 messages and user chats',
    database: true,
    interactiveOAuth: false,
    customTokenAuth: true,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_THIRD_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_THIRD_DATABASE_URL',
  },
  groups: {
    alias: 'groups',
    appName: 'discuss-fourth-groups',
    description: 'Fourth RTDB: Group chat rooms and memberships',
    database: true,
    interactiveOAuth: false,
    customTokenAuth: true,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_FOURTH_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_FOURTH_DATABASE_URL',
  },
  stories: {
    alias: 'stories',
    appName: 'signalDb',
    description: 'Fifth RTDB: Signal 24-hour stories and views',
    database: true,
    interactiveOAuth: false,
    customTokenAuth: true,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_FIFTH_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_FIFTH_DATABASE_URL',
  },
  devradar: {
    alias: 'devradar',
    appName: 'sixthApp',
    description: 'Sixth RTDB: DevRadar technical news & telemetry',
    database: true,
    interactiveOAuth: false,
    customTokenAuth: true,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_SIXTH_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_SIXTH_DATABASE_URL',
  },
};

/**
 * Returns capabilities configuration for a named project alias.
 * @param {string} alias - Target alias ('primary', 'secondary', 'chats', etc.)
 * @returns {object|null}
 */
export const getProjectCapabilities = (alias) => {
  return FIREBASE_PROJECT_CAPABILITIES[alias] || null;
};

/**
 * Returns true if the project supports interactive browser OAuth (Google popup / redirect).
 * @param {string} alias
 * @returns {boolean}
 */
export const doesProjectSupportInteractiveOAuth = (alias) => {
  const caps = getProjectCapabilities(alias);
  return Boolean(caps && caps.interactiveOAuth);
};

/**
 * Returns true if the project requires custom token authentication for RTDB security rules.
 * @param {string} alias
 * @returns {boolean}
 */
export const doesProjectRequireCustomTokenAuth = (alias) => {
  const caps = getProjectCapabilities(alias);
  return Boolean(caps && caps.customTokenAuth);
};
