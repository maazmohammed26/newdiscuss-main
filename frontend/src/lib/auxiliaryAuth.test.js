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
import { synchronizeAuxiliaryAuth } from './auxiliaryAuth';

test('auxiliary Firebase sessions preserve the primary UID', async () => {
  getAuthenticatedIdToken.mockResolvedValue('primary-token');
  getAuth.mockImplementation((app) => ({ app, currentUser: null }));
  signInWithCustomToken.mockResolvedValue({ user: { uid: 'user-1' } });
  global.fetch = jest.fn().mockImplementation(async (_url, request) => ({
    ok: true,
    status: 200,
    json: async () => ({ token: `custom-${JSON.parse(request.body).project}` }),
  }));

  const results = await synchronizeAuxiliaryAuth('user-1');

  expect(results).toHaveLength(2);
  expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
  expect(signInWithCustomToken).toHaveBeenCalledTimes(2);
  expect(signInWithCustomToken.mock.calls.map((call) => call[1])).toEqual(['custom-secondary', 'custom-chats']);
});
