jest.mock('./firebase', () => ({
  database: {},
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('./firebaseThird', () => ({
  thirdDatabase: {},
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(),
  update: jest.fn(),
}));

jest.mock('./firebaseFourth', () => ({
  fourthDatabase: {},
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(),
  update: jest.fn(),
}));

jest.mock('./chatsDb', () => ({
  generateChatId: (a, b) => [a, b].sort().join('_'),
  getOrCreateChat: jest.fn(),
}));

import {
  isBlinkExpired,
  isBlinkViewed,
  getDecryptedBlinkMedia,
  sanitizeStorageKey,
  BLINK_EXPIRY_HOURS
} from './blinkService';


describe('Blink Service Unit & Privacy Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('24-Hour Expiry Verification', () => {
    it('verifies BLINK_EXPIRY_HOURS constant is exactly 24', () => {
      expect(BLINK_EXPIRY_HOURS).toBe(24);
    });

    it('returns false for newly created Blink with expiresAt 24 hours in the future', () => {
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const message = {
        type: 'blink',
        expiresAt: futureExpiry,
        viewed: false
      };
      expect(isBlinkExpired(message)).toBe(false);
    });

    it('returns true when expiresAt timestamp has elapsed', () => {
      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      const message = {
        type: 'blink',
        expiresAt: pastExpiry,
        viewed: false
      };
      expect(isBlinkExpired(message)).toBe(true);
    });

    it('returns true when expired flag is explicitly set', () => {
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const message = {
        type: 'blink',
        expiresAt: futureExpiry,
        expired: true
      };
      expect(isBlinkExpired(message)).toBe(true);
    });

    it('handles legacy message using timestamp + 24h fallback', () => {
      const freshTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hr ago
      expect(isBlinkExpired({ timestamp: freshTimestamp })).toBe(false);

      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hrs ago
      expect(isBlinkExpired({ timestamp: oldTimestamp })).toBe(true);
    });
  });

  describe('View-Once & Multi-Recipient Independence', () => {
    it('tracks 1-on-1 direct view-once status accurately', () => {
      const unviewedMsg = { type: 'blink', viewed: false };
      expect(isBlinkViewed(unviewedMsg, 'user_123', false)).toBe(false);

      const viewedMsg = { type: 'blink', viewed: true, viewedAt: new Date().toISOString() };
      expect(isBlinkViewed(viewedMsg, 'user_123', false)).toBe(true);
    });

    it('guarantees independent view-once state per user in group Blinks', () => {
      const groupBlink = {
        type: 'blink',
        viewedBy: {
          alice_1: { viewedAt: new Date().toISOString() },
          bob_2: { viewedAt: new Date().toISOString() }
        }
      };

      // Alice and Bob have viewed
      expect(isBlinkViewed(groupBlink, 'alice_1', true)).toBe(true);
      expect(isBlinkViewed(groupBlink, 'bob_2', true)).toBe(true);

      // Charlie has NOT viewed - must remain unconsumed for Charlie
      expect(isBlinkViewed(groupBlink, 'charlie_3', true)).toBe(false);
      expect(isBlinkViewed(groupBlink, 'dana_4', true)).toBe(false);
    });

    it('handles empty or missing viewedBy gracefully in groups', () => {
      const groupBlinkWithoutViews = { type: 'blink', viewedBy: {} };
      expect(isBlinkViewed(groupBlinkWithoutViews, 'user_999', true)).toBe(false);

      const groupBlinkNull = { type: 'blink' };
      expect(isBlinkViewed(groupBlinkNull, 'user_999', true)).toBe(false);
    });
  });

  describe('Storage Key Sanitization for Realtime Database', () => {
    it('sanitizes forbidden RTDB characters like slashes, dots, and brackets in publicIds', () => {
      const publicId = 'discuss/blink/photo.user_1$#[]';
      const safeKey = sanitizeStorageKey(publicId);

      expect(safeKey).not.toContain('/');
      expect(safeKey).not.toContain('.');
      expect(safeKey).not.toContain('$');
      expect(safeKey).not.toContain('#');
      expect(safeKey).not.toContain('[');
      expect(safeKey).not.toContain(']');
      expect(safeKey).toBe('discuss___blink___photo___user_1___');
    });

    it('provides fallback when publicId is empty or undefined', () => {
      const fallback = sanitizeStorageKey(null);
      expect(fallback).toMatch(/^blink_\d+$/);
    });
  });

  describe('Media Presentation & Security', () => {
    it('correctly returns URL and thumbnail for presentation', () => {
      const media = {
        url: 'https://res.cloudinary.com/discuss/image/upload/v1/discuss/blink/sample.jpg',
        thumbnail: 'https://res.cloudinary.com/discuss/image/upload/c_thumb,w_200/discuss/blink/sample.jpg',
        publicId: 'discuss/blink/sample'
      };

      const result = getDecryptedBlinkMedia(media);
      expect(result).not.toBeNull();
      expect(result.url).toBe(media.url);
      expect(result.thumbnail).toBe(media.thumbnail);
    });

    it('falls back to media.url if thumbnail is missing', () => {
      const media = {
        url: 'https://res.cloudinary.com/discuss/image/upload/sample.jpg'
      };
      const result = getDecryptedBlinkMedia(media);
      expect(result.thumbnail).toBe(media.url);
    });

    it('returns null if media or url is null', () => {
      expect(getDecryptedBlinkMedia(null)).toBeNull();
      expect(getDecryptedBlinkMedia({})).toBeNull();
    });
  });
});
