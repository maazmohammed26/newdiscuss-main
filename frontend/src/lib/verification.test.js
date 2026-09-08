import {
  isUserVerified,
  registerVerifiedUser,
  isUserIdVerified,
  clearVerifiedRegistry,
  subscribeToVerificationChanges,
} from './verification';

describe('verification system', () => {
  beforeEach(() => {
    clearVerifiedRegistry();
  });

  it('correctly identifies verified entities with true boolean or string flags', () => {
    expect(isUserVerified({ verified: true })).toBe(true);
    expect(isUserVerified({ author_verified: 'true' })).toBe(true);
    expect(isUserVerified({ isVerified: true })).toBe(true);
    expect(isUserVerified({ authorVerified: 'true' })).toBe(true);
    expect(isUserVerified({ author: { verified: true } })).toBe(true);
    expect(isUserVerified({ user: { is_verified: true } })).toBe(true);
  });

  it('rejects unverified entities with false flags', () => {
    expect(isUserVerified({ verified: false })).toBe(false);
    expect(isUserVerified({ author_verified: 'false' })).toBe(false);
    expect(isUserVerified({ isVerified: false })).toBe(false);
    expect(isUserVerified(null)).toBe(false);
    expect(isUserVerified({})).toBe(false);
  });

  it('ensures RTDB user/profile verification state is canonical and overrides in-memory cache', () => {
    const userId = 'dev-user-42';
    
    // 1. User was registered in cache
    registerVerifiedUser(userId, true);
    expect(isUserIdVerified(userId)).toBe(true);

    // 2. Newer RTDB user profile arrives where verified is false
    const rtdbUserProfile = {
      id: userId,
      username: 'dev_maaz',
      email: 'dev@example.com',
      verified: false,
    };

    // RTDB profile must immediately return false and clean up the cached entry
    expect(isUserVerified(rtdbUserProfile)).toBe(false);
    expect(isUserIdVerified(userId)).toBe(false);
  });

  it('ensures authoritative profile omitting verified is treated as unverified, not overridden by cache', () => {
    const userId = 'dev-user-99';
    registerVerifiedUser(userId, true);

    const rtdbUserProfile = {
      id: userId,
      username: 'new_coder',
      email: 'coder@example.com',
      bio: 'Building things',
      // verified is omitted (undefined)
    };

    // Authoritative profile from RTDB must NOT be marked verified by stale cache
    expect(isUserVerified(rtdbUserProfile)).toBe(false);
    expect(isUserIdVerified(userId)).toBe(false);
  });

  it('notifies subscribers on verification changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToVerificationChanges(listener);

    registerVerifiedUser('user-1', true);
    expect(listener).toHaveBeenCalledTimes(1);

    registerVerifiedUser('user-1', false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    registerVerifiedUser('user-2', true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
