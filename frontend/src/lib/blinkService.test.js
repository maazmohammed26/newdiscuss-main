jest.mock('./firebase', () => ({
  database: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('./firebaseThird', () => ({
  thirdDatabase: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(() => ({ key: 'msg_test_123' })),
  update: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('./firebaseFourth', () => ({
  fourthDatabase: {},
  ref: jest.fn((db, path) => ({ path })),
  get: jest.fn(),
  set: jest.fn(),
  push: jest.fn(() => ({ key: 'group_msg_123' })),
  update: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('./chatsDb', () => ({
  generateChatId: (a, b) => [a, b].sort().join('_'),
  getOrCreateChat: jest.fn().mockResolvedValue({ id: 'chat_userA_userB' }),
}));

jest.mock('./notificationService', () => ({
  emitNotificationEvent: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('./pushNotificationService', () => ({
  notifyChatMessage: jest.fn(),
}));

import {
  isBlinkExpired,
  isBlinkViewed,
  getDecryptedBlinkMedia,
  sanitizeStorageKey,
  claimBlinkView,
  sendDirectBlink,
  sendGroupBlink,
  markBlinkAsViewed,
  BLINK_EXPIRY_HOURS
} from './blinkService';
import {
  ref as mockChatsRef,
  get as mockChatsGet,
  update as mockChatsUpdate,
  runTransaction as mockRunChatsTransaction
} from './firebaseThird';
import {
  ref as mockGroupsRef,
  get as mockGroupsGet,
  push as mockGroupsPush,
  runTransaction as mockRunFourthTransaction
} from './firebaseFourth';
import { emitNotificationEvent } from './notificationService';

describe('Blink Service Unit, Privacy & Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockChatsRef.mockImplementation((db, path) => ({ path }));
    mockGroupsRef.mockImplementation((db, path) => ({ path }));
    mockGroupsPush.mockImplementation(() => ({ key: 'group_msg_123' }));
    emitNotificationEvent.mockResolvedValue({ ok: true });
    mockGroupsGet.mockResolvedValue({
      exists: () => true,
      val: () => ({ role: 'member' })
    });
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

      const claimedMsg = { type: 'blink', claim: { claimedBy: 'user_123' } };
      expect(isBlinkViewed(claimedMsg, 'user_123', false)).toBe(true);
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

  describe('Atomic View-Once Claim & Race Condition Protection', () => {
    it('successfully claims a 1-on-1 Blink on initial open', async () => {
      mockChatsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          viewed: false,
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });

      mockRunChatsTransaction.mockImplementationOnce(async (ref, txFn) => {
        const result = txFn(null); // uncommitted, fresh node
        return { committed: true, snapshot: { val: () => result } };
      });
      mockChatsUpdate.mockResolvedValueOnce({});

      const result = await claimBlinkView({
        chatId: 'chat_123',
        messageId: 'msg_001',
        viewerId: 'user_bob',
        isGroup: false
      });

      expect(result.success).toBe(true);
      expect(mockRunChatsTransaction).toHaveBeenCalled();
      expect(mockChatsUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ viewed: true })
      );
    });

    it('rejects simultaneous race condition or double open in 1-on-1 Blink', async () => {
      // Simulate another tab or device already claimed the view-once lock
      mockChatsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          viewed: false,
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });

      mockRunChatsTransaction.mockImplementationOnce(async (ref, txFn) => {
        // Transaction function receives existing claim node from racing tab
        const existingClaim = { claimedBy: 'user_bob', claimedAt: new Date().toISOString() };
        const result = txFn(existingClaim); // Aborts inside txFn
        return { committed: false, snapshot: { val: () => existingClaim } };
      });

      const secondAttempt = await claimBlinkView({
        chatId: 'chat_123',
        messageId: 'msg_001',
        viewerId: 'user_bob',
        isGroup: false
      });

      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.reason).toBe('ALREADY_VIEWED');
    });

    it('rejects claim immediately if 1-on-1 message is already viewed', async () => {
      mockChatsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          viewed: true,
          viewedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });

      const result = await claimBlinkView({
        chatId: 'chat_123',
        messageId: 'msg_001',
        viewerId: 'user_bob',
        isGroup: false
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('ALREADY_VIEWED');
      expect(mockRunChatsTransaction).not.toHaveBeenCalled();
    });

    it('rejects claim if 1-on-1 Blink has expired', async () => {
      mockChatsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          viewed: false,
          expiresAt: new Date(Date.now() - 5000).toISOString()
        })
      });

      const result = await claimBlinkView({
        chatId: 'chat_123',
        messageId: 'msg_001',
        viewerId: 'user_bob',
        isGroup: false
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('EXPIRED');
    });

    it('atomically claims group Blink per member and isolates other members', async () => {
      mockGroupsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });

      mockRunFourthTransaction.mockImplementationOnce(async (ref, txFn) => {
        const result = txFn(null); // Member has not viewed
        return { committed: true, snapshot: { val: () => result } };
      });

      // User A claims group Blink
      const resultA = await claimBlinkView({
        groupId: 'grp_tech',
        messageId: 'grp_msg_1',
        viewerId: 'user_alice',
        isGroup: true
      });

      expect(resultA.success).toBe(true);

      // User A tries to open again -> rejected
      mockGroupsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });
      mockRunFourthTransaction.mockImplementationOnce(async (ref, txFn) => {
        const existing = { claimedAt: new Date().toISOString() };
        txFn(existing); // aborts
        return { committed: false, snapshot: { val: () => existing } };
      });

      const secondAttemptA = await claimBlinkView({
        groupId: 'grp_tech',
        messageId: 'grp_msg_1',
        viewerId: 'user_alice',
        isGroup: true
      });

      expect(secondAttemptA.success).toBe(false);
      expect(secondAttemptA.reason).toBe('ALREADY_VIEWED');

      // User B claims same group Blink -> succeeds independently
      mockGroupsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          expiresAt: new Date(Date.now() + 100000).toISOString()
        })
      });
      mockRunFourthTransaction.mockImplementationOnce(async (ref, txFn) => {
        const result = txFn(null); // User B has not viewed
        return { committed: true, snapshot: { val: () => result } };
      });

      const resultB = await claimBlinkView({
        groupId: 'grp_tech',
        messageId: 'grp_msg_1',
        viewerId: 'user_bob',
        isGroup: true
      });

      expect(resultB.success).toBe(true);
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

  describe('Backend Cloudinary Signing & CDN Invalidation Specification', () => {
    it('verifies alphabetical parameter ordering for Cloudinary destroy signature with invalidate=true', () => {
      const publicId = 'discuss/blink/photo_123';
      const timestamp = 1700000000;
      const apiSecret = 'test_secret';

      // Cloudinary API requirement: parameters sorted alphabetically before signing
      // "invalidate=true&public_id=" + publicId + "&timestamp=" + timestamp + apiSecret
      const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      
      expect(stringToSign).toContain('invalidate=true');
      expect(stringToSign.indexOf('invalidate')).toBeLessThan(stringToSign.indexOf('public_id'));
      expect(stringToSign.indexOf('public_id')).toBeLessThan(stringToSign.indexOf('timestamp'));
    });

    it('guarantees frontend code does not possess or export Cloudinary destroy secret', async () => {
      expect(process.env.REACT_APP_CLOUDINARY_API_SECRET).toBeUndefined();
      
      const cloudinaryModule = await import('./cloudinary');
      expect(cloudinaryModule.deleteImage).toBeUndefined();
    });
  });

  describe('Multi-Recipient Direct Blink Isolation', () => {
    it('isolates media consumption between distinct recipients when user views 1-on-1 Blink', async () => {
      const publicId = 'discuss/blink/shared_asset_456';
      
      // User A views their Blink
      mockChatsGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            sender: 'sender_user',
            media: { publicId, url: 'https://res.cloudinary.com/test/image.jpg' }
          })
        });

      mockRunChatsTransaction.mockImplementationOnce(async (ref, txFn) => ({
        committed: true,
        snapshot: {
          val: () => txFn({
            publicId,
            pendingRecipients: { user_A: true, user_B: true },
            deletedFromCloudinary: false
          })
        }
      }));

      await markBlinkAsViewed('chat_sender_userA', 'msg_userA', 'user_A', publicId);

      // User A's message was marked viewed and media set to null
      expect(mockChatsUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          viewed: true,
          media: null
        })
      );

      // Central registry transaction removes user_A while preserving user_B.
      const registryCall = mockRunChatsTransaction.mock.calls[0];
      expect(registryCall[0].path).toContain('blinkMediaRegistry');
      expect(registryCall[1]({
        publicId,
        pendingRecipients: { user_A: true, user_B: true }
      })).toEqual(expect.objectContaining({
        pendingRecipients: { user_B: true },
        allViewed: false
      }));
    });
  });

  describe('Group Blink dispatch', () => {
    it('validates membership and notifies each recipient except the sender', async () => {
      mockGroupsGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          name: 'Design Team',
          members: {
            sender_user: { role: 'admin' },
            recipient_a: { role: 'member' },
            recipient_b: { role: 'member' }
          },
          settings: { adminOnlyMessaging: true }
        })
      });

      await sendGroupBlink({
        groupId: 'group_123',
        senderId: 'sender_user',
        senderUsername: 'sender',
        mediaData: {
          url: 'https://res.cloudinary.com/test/blink.jpg',
          publicId: 'discuss/blink/group_123'
        }
      });

      expect(emitNotificationEvent).toHaveBeenCalledTimes(1);
      expect(emitNotificationEvent).toHaveBeenCalledWith({
        type: 'blink',
        recipientIds: ['recipient_a', 'recipient_b'],
        entityId: 'group_msg_123',
        url: '/group/group_123',
        data: { groupName: 'Design Team' },
      });
      expect(emitNotificationEvent.mock.calls[0][0].recipientIds).not.toContain('sender_user');
    });
  });
});
