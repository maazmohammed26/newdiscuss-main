import {
  getCachedUserProfile,
  setCachedUserProfile,
  isProfileCacheValid,
  clearCachedUserProfile,
  saveUserProfile,
  getUserProfile,
  updateBannerTheme
} from './userProfileDb';
import * as secondaryDb from './firebaseSecondary';

jest.mock('./firebaseSecondary', () => ({
  secondaryDatabase: {},
  ref: jest.fn(() => ({})),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
}));

describe('userProfileDb cache and hydration', () => {
  beforeEach(() => {
    clearCachedUserProfile();
    jest.clearAllMocks();
  });

  it('returns null when no profile data is cached', () => {
    expect(getCachedUserProfile('test-uid-1')).toBeNull();
    expect(isProfileCacheValid('test-uid-1')).toBe(false);
  });

  it('immediately stores and retrieves valid fresh cached profile', () => {
    const profile = { fullName: 'Maaz Developer', bannerThemeId: 'gradient-05' };
    setCachedUserProfile('test-uid-1', profile);

    const cached = getCachedUserProfile('test-uid-1');
    expect(cached).not.toBeNull();
    expect(cached.fullName).toBe('Maaz Developer');
    expect(cached.bannerThemeId).toBe('gradient-05');
    expect(isProfileCacheValid('test-uid-1')).toBe(true);
  });

  it('optimistically updates cache immediately on updateBannerTheme', async () => {
    secondaryDb.get.mockResolvedValue({
      exists: () => true,
      val: () => ({ bannerThemeId: 'gradient-01' })
    });
    secondaryDb.update.mockResolvedValue();

    // Initial cache
    setCachedUserProfile('user-123', { bannerThemeId: 'gradient-01' });

    // Call updateBannerTheme
    const promise = updateBannerTheme('user-123', 'gradient-09');

    // Immediately after calling (even before promise resolution), cache should reflect optimistic state
    const optimistic = getCachedUserProfile('user-123');
    expect(optimistic.bannerThemeId).toBe('gradient-09');

    await promise;
    expect(secondaryDb.update).toHaveBeenCalled();
  });

  it('rolls back cached state if remote write fails', async () => {
    secondaryDb.get.mockRejectedValue(new Error('Network failure'));

    setCachedUserProfile('user-rollback', { fullName: 'Original Name' });

    await expect(saveUserProfile('user-rollback', { fullName: 'Failed New Name' }))
      .rejects.toThrow('Network failure');

    // Cache should be rolled back to original
    const cached = getCachedUserProfile('user-rollback');
    expect(cached.fullName).toBe('Original Name');
  });

  it('populates cache on successful remote getUserProfile fetch', async () => {
    secondaryDb.get.mockResolvedValue({
      exists: () => true,
      val: () => ({
        fullName: 'Remote Name',
        bannerThemeId: 'gradient-12',
        socialLinks: [{ name: 'GitHub', url: 'https://github.com/maaz' }]
      })
    });

    const result = await getUserProfile('remote-user');
    expect(result.fullName).toBe('Remote Name');
    expect(result.bannerThemeId).toBe('gradient-12');

    // Synchronous cache now populated
    const cached = getCachedUserProfile('remote-user');
    expect(cached).not.toBeNull();
    expect(cached.bannerThemeId).toBe('gradient-12');
  });
});
