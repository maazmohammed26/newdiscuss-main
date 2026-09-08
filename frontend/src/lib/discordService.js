// Discord account settings live in Firebase; bot delivery is server-side only.
import { database, ref, update, remove, get } from './firebase';
import { invalidateUserCache } from './db';
import { emitNotificationEvent } from './notificationService';

export const BOT_USERNAME = 'Discuss Notification#4408';
export const APP_URL = 'https://discussit.in/';

export const saveDiscordUserId = async (userId, discordId) => {
  await update(ref(database, `users/${userId}`), { discordUserId: String(discordId).trim() });
  invalidateUserCache(userId);
};

export const getDiscordUserId = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/discordUserId`));
    return snapshot.exists() ? String(snapshot.val()) : null;
  } catch (_) { return null; }
};

export const removeDiscordUserId = async (userId) => {
  await remove(ref(database, `users/${userId}/discordUserId`));
  invalidateUserCache(userId);
};

export const saveDiscordPrivacy = async (userId, isPrivate) => {
  await update(ref(database, `users/${userId}`), { discordPrivacy: Boolean(isPrivate) });
  invalidateUserCache(userId);
};

export const getDiscordPrivacy = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/discordPrivacy`));
    return snapshot.exists() ? Boolean(snapshot.val()) : true;
  } catch (_) { return true; }
};

export const getDiscordSettings = async (userId) => ({
  userId: await getDiscordUserId(userId),
  isPrivate: await getDiscordPrivacy(userId),
});

const event = (type, recipientId, data = {}, url = '/') => emitNotificationEvent({ type, recipientId, data, url });
export const notifyDiscordDM = (id, _sender, text = '', hasMedia = false) => event('direct_message', id, { text, hasMedia }, '/chat');
export const notifyDiscordGroupMessage = (id, groupName, _sender, text = '', hasMedia = false) => event('group_message', id, { groupName, text, hasMedia }, '/chat');
export const notifyDiscordComment = (id, _sender, text = '') => event('comment', id, { text });
export const notifyDiscordReply = (id, _sender, text = '') => event('reply', id, { text });
export const notifyDiscordLike = (id, _sender, type = 'post') => event(type === 'pulse' ? 'pulse_like' : 'like', id);
export const notifyDiscordFriendRequest = (id) => event('friend_request', id, {}, '/profile');
export const notifyDiscordFriendAccepted = (id) => event('friend_accepted', id, {}, '/profile');
export const notifyDiscordGroupJoinAccepted = (id, groupName) => event('group_join_accepted', id, { groupName }, '/chat');

export default {
  saveDiscordUserId,
  getDiscordUserId,
  removeDiscordUserId,
  saveDiscordPrivacy,
  getDiscordPrivacy,
  getDiscordSettings,
};
