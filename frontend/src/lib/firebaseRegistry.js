/**
 * firebaseRegistry.js — Centralized Firebase Project Capabilities Map
 *
 * Explicitly declares which capabilities each Firebase project supports.
 * CRITICAL RELIABILITY RULE:
 *   If an auxiliary Firebase project is database-only, browserAuth MUST be false.
 *   Calling getAuth(auxApp) on projects where Firebase Authentication is unconfigured
 *   causes the Firebase Auth iframe to ping Google Identity Toolkit (getProjectConfig)
 *   and emit 400 CONFIGURATION_NOT_FOUND errors into the developer console.
 */

export const FIREBASE_PROJECT_CAPABILITIES = {
  primary: {
    alias: 'primary',
    appName: '[DEFAULT]',
    description: 'Primary platform identity, core feeds, notifications, and media storage',
    database: true,
    browserAuth: true,
    storage: true,
    projectIdEnv: 'REACT_APP_FIREBASE_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_DATABASE_URL',
  },
  secondary: {
    alias: 'secondary',
    appName: 'secondary',
    description: 'Secondary RTDB: Comments and Extended Profiles',
    database: true,
    browserAuth: false,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_SECONDARY_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_SECONDARY_DATABASE_URL',
  },
  chats: {
    alias: 'chats',
    appName: 'chatDb',
    description: 'Third RTDB: Direct 1-to-1 messages and user chats',
    database: true,
    browserAuth: false,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_THIRD_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_THIRD_DATABASE_URL',
  },
  groups: {
    alias: 'groups',
    appName: 'discuss-fourth-groups',
    description: 'Fourth RTDB: Group chat rooms and memberships',
    database: true,
    browserAuth: false,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_FOURTH_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_FOURTH_DATABASE_URL',
  },
  stories: {
    alias: 'stories',
    appName: 'signalDb',
    description: 'Fifth RTDB: Signal 24-hour stories and views',
    database: true,
    browserAuth: false,
    storage: false,
    projectIdEnv: 'REACT_APP_FIREBASE_FIFTH_PROJECT_ID',
    databaseUrlEnv: 'REACT_APP_FIREBASE_FIFTH_DATABASE_URL',
  },
  devradar: {
    alias: 'devradar',
    appName: 'sixthApp',
    description: 'Sixth RTDB: DevRadar technical news & telemetry',
    database: true,
    browserAuth: false,
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
 * Returns true if the project explicitly requires browser Firebase Auth.
 * @param {string} alias
 * @returns {boolean}
 */
export const doesProjectRequireBrowserAuth = (alias) => {
  const caps = getProjectCapabilities(alias);
  return Boolean(caps && caps.browserAuth);
};
