import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockFirebaseSignOut = jest.fn().mockResolvedValue(undefined);
const mockPurgeUserSessionCaches = jest.fn().mockResolvedValue(undefined);
const mockLogoutOneSignalUser = jest.fn();
const mockSignOutAuxiliaryAuth = jest.fn().mockResolvedValue(undefined);
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/firebase', () => ({
  __esModule: true,
  auth: { currentUser: { uid: 'user_123', email: 'test@example.com' } },
  authReady: Promise.resolve(),
  signOut: (...args) => mockFirebaseSignOut(...args),
  onAuthStateChanged: jest.fn(() => () => {}),
  getRedirectResult: jest.fn().mockResolvedValue(null),
  isSignInWithEmailLink: jest.fn(() => false),
  signInWithEmailLink: jest.fn().mockResolvedValue({ user: { uid: 'user_123' } }),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendSignInLinkToEmail: jest.fn().mockResolvedValue(undefined),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  fetchSignInMethodsForEmail: jest.fn().mockResolvedValue([]),
  googleProvider: { setCustomParameters: jest.fn() },
  database: {},
  ref: jest.fn((_, path) => path || 'dummy-path'),
  onValue: jest.fn(() => () => {}),
  get: jest.fn().mockResolvedValue({ exists: () => false, val: () => null }),
  set: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase/database', () => ({
  __esModule: true,
  update: jest.fn(() => Promise.resolve()),
  onDisconnect: jest.fn(() => ({
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@/lib/firebaseSixth', () => ({
  isDevRadarDbAvailable: jest.fn(() => false),
  devRadarDatabase: {},
}));

jest.mock('@/lib/cacheManager', () => ({
  purgeUserSessionCaches: (...args) => mockPurgeUserSessionCaches(...args),
}));

jest.mock('@/lib/sessionManager', () => ({
  registerSession: jest.fn().mockResolvedValue(() => {}),
}));

jest.mock('@/lib/pushNotificationService', () => ({
  logoutOneSignalUser: () => mockLogoutOneSignalUser(),
  syncOneSignalUser: jest.fn(),
}));

jest.mock('@/lib/auxiliaryAuth', () => ({
  __esModule: true,
  synchronizeAuxiliaryAuth: jest.fn(() => Promise.resolve()),
  signOutAuxiliaryAuth: () => mockSignOutAuxiliaryAuth(),
}));

jest.mock('@/platform/platformAdapter', () => ({
  isNativeApp: () => false,
  getMedianBridge: () => null,
}));

jest.mock('@/lib/db', () => ({
  getUser: jest.fn().mockResolvedValue({ id: 'user_123', username: 'testuser' }),
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  checkUsernameAvailable: jest.fn(),
  updateUser: jest.fn(),
  syncUserVerificationEverywhere: jest.fn().mockResolvedValue(undefined),
  savePendingOTP: jest.fn(),
}));

jest.mock('@/lib/commentsDb', () => ({
  syncUserVerificationInCommentsFirestore: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/verification', () => ({
  registerVerifiedUser: jest.fn(),
  isUserVerified: () => false,
}));

jest.mock('@/lib/telegramService', () => ({
  notifyAdminUserSignup: jest.fn(),
}));

jest.mock('@/lib/emailService', () => ({
  sendVerificationOTPDirectly: jest.fn(),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

describe('Logout Flow & Auth Guard Race Regression Tests', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('discuss_auth_session_v1', JSON.stringify({
      id: 'user_123',
      email: 'test@example.com',
      username: 'testuser',
    }));
    window.localStorage.setItem('discuss_last_unlocked', '123456');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    window.localStorage.clear();
  });

  it('invokes canonical signOut, clears auth state, purges session tokens, and navigates to public route', async () => {
    let authContextValues = null;
    const mockNavigate = jest.fn();

    function TestConsumer() {
      authContextValues = useAuth();
      return (
        <div>
          <span data-testid="user-status">{authContextValues.user ? 'logged_in' : 'logged_out'}</span>
          <span data-testid="signing-out">{authContextValues.signingOut ? 'signing_out' : 'idle'}</span>
          <button
            data-testid="logout-btn"
            disabled={authContextValues.signingOut}
            onClick={() => authContextValues.logout({ navigate: mockNavigate })}
          >
            Logout
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(authContextValues.user?.id).toBe('user_123');
    expect(window.localStorage.getItem('discuss_auth_session_v1')).toBeTruthy();
    expect(window.localStorage.getItem('discuss_last_unlocked')).toBeTruthy();

    const logoutBtn = container.querySelector('[data-testid="logout-btn"]');

    await act(async () => {
      logoutBtn.click();
    });

    // 1. Firebase signOut was called
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);

    // 2. User caches and auxiliary auth were purged
    expect(mockPurgeUserSessionCaches).toHaveBeenCalledWith('user_123');
    expect(mockLogoutOneSignalUser).toHaveBeenCalled();
    expect(mockSignOutAuxiliaryAuth).toHaveBeenCalled();

    // 3. Sensitive session snapshot and unlock flags removed from localStorage
    expect(window.localStorage.getItem('discuss_auth_session_v1')).toBeNull();
    expect(window.localStorage.getItem('discuss_last_unlocked')).toBeNull();

    // 4. User context state became null
    expect(authContextValues.user).toBeNull();
    expect(container.querySelector('[data-testid="user-status"]').textContent).toBe('logged_out');

    // 5. Final navigation targeted public landing route '/'
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith('/feed', expect.anything());
  });

  it('blocks duplicate logout taps while signOut is already in progress', async () => {
    let authContextValues = null;
    let resolveFirebase = null;
    mockFirebaseSignOut.mockImplementation(
      () => new Promise((resolve) => { resolveFirebase = resolve; })
    );

    function TestConsumer() {
      authContextValues = useAuth();
      return (
        <div>
          <button
            data-testid="logout-btn"
            disabled={authContextValues.signingOut}
            aria-busy={authContextValues.signingOut}
            onClick={() => authContextValues.logout()}
          >
            {authContextValues.signingOut ? 'Logging out…' : 'Log Out'}
          </button>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    const logoutBtn = container.querySelector('[data-testid="logout-btn"]');

    // First click initiates logout
    act(() => {
      logoutBtn.click();
    });

    expect(authContextValues.signingOut).toBe(true);
    expect(logoutBtn.disabled).toBe(true);
    expect(logoutBtn.getAttribute('aria-busy')).toBe('true');
    expect(logoutBtn.textContent).toBe('Logging out…');

    // Duplicate clicks while pending
    act(() => {
      logoutBtn.click();
      logoutBtn.click();
    });

    // Allow microtasks leading up to firebaseSignOut to settle
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Only one Firebase signOut invocation
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);

    // Complete the signOut promise
    await act(async () => {
      resolveFirebase();
    });

    expect(authContextValues.signingOut).toBe(false);
  });

  it('signOut alias invokes canonical logout handler identically', async () => {
    let authContextValues = null;

    function TestConsumer() {
      authContextValues = useAuth();
      return null;
    }

    try {
      await act(async () => {
        root.render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        );
      });
    } catch (e) {
      console.log('Errors in test 3:', e.errors || [e.message]);
      throw e;
    }

    expect(authContextValues.signOut).toBe(authContextValues.logout);
  });
});
