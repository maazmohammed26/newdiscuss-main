// Telegram account settings live in Firebase; delivery is server-side only.
import { database, ref, update, remove, get } from './firebase';
import { invalidateUserCache } from './db';
import { emitNotificationEvent } from './notificationService';
import { getAuthenticatedIdToken } from './authenticatedRequest';

export const BOT_USERNAME = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'DiscussNotifications_bot';
export const APP_URL = 'https://discussit.in/';

export const saveTelegramChatId = async (userId, chatId) => {
  await update(ref(database, `users/${userId}`), { telegramChatId: String(chatId).trim() });
  invalidateUserCache(userId);
};

export const getTelegramChatId = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/telegramChatId`));
    return snapshot.exists() ? String(snapshot.val()) : null;
  } catch (_) { return null; }
};

export const removeTelegramChatId = async (userId) => {
  await remove(ref(database, `users/${userId}/telegramChatId`));
  invalidateUserCache(userId);
};

export const saveTelegramPrivacy = async (userId, isPrivate) => {
  await update(ref(database, `users/${userId}`), { telegramPrivacy: Boolean(isPrivate) });
  invalidateUserCache(userId);
};

export const getTelegramPrivacy = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/telegramPrivacy`));
    return snapshot.exists() ? Boolean(snapshot.val()) : true;
  } catch (_) { return true; }
};

export const getTelegramSettings = async (userId) => ({
  chatId: await getTelegramChatId(userId),
  isPrivate: await getTelegramPrivacy(userId),
});

const compatibilityEvent = (type, recipientId, data = {}, url = '/') => (
  emitNotificationEvent({ type, recipientId, data, url })
);

export const notifyTelegramDM = (recipientId, _sender, text = '', hasMedia = false) => compatibilityEvent('direct_message', recipientId, { text, hasMedia }, '/chat');
export const notifyTelegramGroupMessage = (recipientId, groupName, _sender, text = '', hasMedia = false) => compatibilityEvent('group_message', recipientId, { groupName, text, hasMedia }, '/chat');
export const notifyTelegramComment = (recipientId, _sender, text = '') => compatibilityEvent('comment', recipientId, { text }, '/');
export const notifyTelegramReply = (recipientId, _sender, text = '') => compatibilityEvent('reply', recipientId, { text }, '/');
export const notifyTelegramLike = (recipientId, _sender, type = 'post') => compatibilityEvent(type === 'pulse' ? 'pulse_like' : 'like', recipientId);
export const notifyTelegramFriendRequest = (recipientId) => compatibilityEvent('friend_request', recipientId, {}, '/profile');
export const notifyTelegramFriendAccepted = (recipientId) => compatibilityEvent('friend_accepted', recipientId, {}, '/profile');
export const notifyTelegramGroupJoinAccepted = (recipientId, groupName) => compatibilityEvent('group_join_accepted', recipientId, { groupName }, '/chat');

const sendAdminEvent = async (type, data) => {
  try {
    const token = await getAuthenticatedIdToken();
    const response = await fetch('/api/admin-notification', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, data }),
    });
    return response.ok;
  } catch (error) {
    console.warn('[Telegram Admin] Event delivery failed:', error?.message);
    return false;
  }
};

export const notifyAdminUserSignup = (username, userId, email) => sendAdminEvent('signup', { username, userId, email });
export const notifyAdminReport = (report) => sendAdminEvent('report', report);

export default {
  saveTelegramChatId,
  getTelegramChatId,
  removeTelegramChatId,
  saveTelegramPrivacy,
  getTelegramPrivacy,
  getTelegramSettings,
  notifyAdminUserSignup,
  notifyAdminReport,
};
