jest.mock('firebase/auth', () => ({
  getAuth: jest.fn((app) => ({ app, currentUser: null })),
  signInWithCustomToken: jest.fn().mockResolvedValue({ user: { uid: 'user-1' } }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./authenticatedRequest', () => ({ getAuthenticatedIdToken: jest.fn() }));
jest.mock('./firebaseSecondary', () => ({ secondaryApp: { name: 'secondary' } }));
jest.mock('./firebaseThird', () => ({ thirdApp: { name: 'chats' } }));
jest.mock('./firebaseFourth', () => ({ fourthApp: null }));
jest.mock('./firebaseFifth', () => ({ fifthApp: null }));
jest.mock('./firebaseSixth', () => ({ devRadarApp: null }));

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getAuthenticatedIdToken } from './authenticatedRequest';
import {
  synchronizeAuxiliaryAuth,
  resetAuxiliaryCooldowns,
  isAuxiliaryCircuitBreakerOpen,
} from './auxiliaryAuth';
import * as firebaseRegistry from './firebaseRegistry';

describe('auxiliaryAuth Coordinator & Circuit Breaker', () => {
  beforeEach(() => {
    resetAuxiliaryCooldowns();
    jest.clearAllMocks();
    getAuth.mockImplementation((app) => ({ app, currentUser: null }));
  });

  test('skips auth initialization and network requests for database-only projects', async () => {
    // By default, firebaseRegistry sets browserAuth: false for all auxiliary targets
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const results = await synchronizeAuxiliaryAuth('user-1');

    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getAuth).not.toHaveBeenCalled();
  });

  test('when a target requires browser auth, custom tokens preserve primary UID', async () => {
    // Mock registry to require auth for 'secondary'
    jest.spyOn(firebaseRegistry, 'doesProjectRequireBrowserAuth').mockImplementation((alias) => {
      return alias === 'secondary';
    });

    getAuthenticatedIdToken.mockResolvedValue('primary-token');
    getAuth.mockImplementation((app) => ({ app, currentUser: null }));
    signInWithCustomToken.mockResolvedValue({ user: { uid: 'user-1' } });
    global.fetch = jest.fn().mockImplementation(async (_url, request) => ({
      ok: true,
      status: 200,
      json: async () => ({ token: `custom-${JSON.parse(request.body).project}` }),
    }));

    const results = await synchronizeAuxiliaryAuth('user-1');

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('fulfilled');
    expect(signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      'custom-secondary'
    );
  });

  test('deduplicates simultaneous concurrent calls into a single in-flight promise', async () => {
    jest.spyOn(firebaseRegistry, 'doesProjectRequireBrowserAuth').mockReturnValue(true);
    getAuthenticatedIdToken.mockResolvedValue('primary-token');

    let fetchCount = 0;
    global.fetch = jest.fn().mockImplementation(async (_url, request) => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: `custom-${JSON.parse(request.body).project}` }),
      };
    });

    // Fire 3 simultaneous calls
    const [p1, p2, p3] = await Promise.all([
      synchronizeAuxiliaryAuth('user-1'),
      synchronizeAuxiliaryAuth('user-1'),
      synchronizeAuxiliaryAuth('user-1'),
    ]);

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });

  test('engages global circuit breaker on 503 and blocks subsequent requests during cooldown', async () => {
    jest.spyOn(firebaseRegistry, 'doesProjectRequireBrowserAuth').mockReturnValue(true);
    getAuthenticatedIdToken.mockResolvedValue('primary-token');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, code: 'AUX_CONFIG_MISSING' }),
    });

    const initialResults = await synchronizeAuxiliaryAuth('user-1');
    expect(initialResults[0].status).toBe('rejected');
    expect(isAuxiliaryCircuitBreakerOpen()).toBe(true);

    // Subsequent call during cooldown should return immediately without hitting fetch
    global.fetch.mockClear();
    const subsequentResults = await synchronizeAuxiliaryAuth('user-1');
    expect(subsequentResults).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();

    // Resetting cooldown allows retrying
    resetAuxiliaryCooldowns();
    expect(isAuxiliaryCircuitBreakerOpen()).toBe(false);
  });
});
