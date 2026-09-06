import {
  formatBodyForPreview,
  urlBase64ToUint8Array,
  isPushSupported,
  canUsePush,
  isNotificationsEnabled,
  isNotificationPreviewEnabled,
  setNotificationsEnabled,
  setNotificationPreviewEnabled,
  canSendChatNotification,
  updateChatCooldown,
  wasNotificationSent,
  markNotificationSent,
} from './pushNotificationService';

describe('pushNotificationService Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('formatBodyForPreview', () => {
    it('returns privacy placeholder when isPreview is false', () => {
      const result = formatBodyForPreview('Secret message content', false);
      expect(result).toBe('New secure alert received. Open app to view.');
    });

    it('returns empty string when bodyText is empty and isPreview is true', () => {
      expect(formatBodyForPreview('', true)).toBe('');
      expect(formatBodyForPreview(null, true)).toBe('');
    });

    it('returns original message when within 6 lines', () => {
      const msg = 'Line 1\nLine 2\nLine 3';
      expect(formatBodyForPreview(msg, true)).toBe(msg);
    });

    it('truncates message beyond 6 lines with app open indicator', () => {
      const msg = '1\n2\n3\n4\n5\n6\n7\n8';
      const result = formatBodyForPreview(msg, true);
      expect(result).toBe('1\n2\n3\n4\n5\n6\n... open in app');
    });
  });

  describe('urlBase64ToUint8Array', () => {
    it('converts url-safe base64 string to Uint8Array properly', () => {
      const sample = 'BD3rYWCGmkrNvyQ8t2GzPdnUySdy4WnEZwm51t_LLIApOK5iI2WQ15ckapmOQQplhiLA68_Ryyifq4ERe4UDTec';
      const arr = urlBase64ToUint8Array(sample);
      expect(arr).toBeInstanceOf(Uint8Array);
      expect(arr.length).toBeGreaterThan(0);
    });
  });

  describe('Local storage notification state', () => {
    it('manages notification enabled status correctly', () => {
      expect(isNotificationsEnabled()).toBe(false);
      setNotificationsEnabled(true);
      // In jsdom without Notification.permission = granted, web returns false
      expect(localStorage.getItem('discuss_notifications_enabled')).toBe('true');
      setNotificationsEnabled(false);
      expect(localStorage.getItem('discuss_notifications_enabled')).toBe('false');
    });

    it('manages preview preference status correctly', () => {
      expect(isNotificationPreviewEnabled()).toBe(true);
      setNotificationPreviewEnabled(false);
      expect(isNotificationPreviewEnabled()).toBe(false);
      expect(localStorage.getItem('discuss_notification_preview_enabled')).toBe('false');
    });

    it('tracks chat cooldown correctly', () => {
      const chatId = 'chat_user1_user2';
      expect(canSendChatNotification(chatId)).toBe(true);
      updateChatCooldown(chatId);
      expect(canSendChatNotification(chatId)).toBe(false);
    });

    it('tracks sent notifications deduplication correctly', () => {
      const type = 'friend_req';
      const id = 'user_123';
      expect(wasNotificationSent(type, id)).toBe(false);
      markNotificationSent(type, id);
      expect(wasNotificationSent(type, id)).toBe(true);
    });
  });
});
