// Telegram Notification Service
// Sends notifications via the Telegram Bot API directly from the browser.
// The user's Telegram Chat ID is stored in Firebase RTDB (users/{uid}/telegramChatId).
// Notification message content is NEVER stored in Firebase.

import { database, ref, update, remove, get } from './firebase';
import { invalidateUserCache } from './db';

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.REACT_APP_TELEGRAM_BOT_TOKEN    || '';
export const BOT_USERNAME = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'DiscussNotifications_bot';

// URL users are directed to when they tap a link in a Telegram notification
export const APP_URL = 'https://discussit.in/';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Firebase helpers ─────────────────────────────────────────────────────────

/**
 * Save a user's Telegram Chat ID to Firebase.
 */
export const saveTelegramChatId = async (userId, chatId) => {
  const trimmed = String(chatId).trim();
  await update(ref(database, `users/${userId}`), { telegramChatId: trimmed });
  invalidateUserCache(userId);
};

/**
 * Read a user's Telegram Chat ID from Firebase.
 */
export const getTelegramChatId = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/telegramChatId`));
    return snapshot.exists() ? String(snapshot.val()) : null;
  } catch {
    return null;
  }
};

/**
 * Remove a user's Telegram Chat ID from Firebase.
 */
export const removeTelegramChatId = async (userId) => {
  await remove(ref(database, `users/${userId}/telegramChatId`));
  invalidateUserCache(userId);
};

/**
 * Save a user's Telegram Privacy setting.
 * true = Privacy ON (don't show content)
 * false = Privacy OFF (show content)
 */
export const saveTelegramPrivacy = async (userId, isPrivate) => {
  await update(ref(database, `users/${userId}`), { telegramPrivacy: !!isPrivate });
  invalidateUserCache(userId);
};

/**
 * Get a user's Telegram Privacy setting.
 * Defaults to true (Privacy ON) for safety.
 */
export const getTelegramPrivacy = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/telegramPrivacy`));
    return snapshot.exists() ? !!snapshot.val() : true;
  } catch {
    return true;
  }
};

/**
 * Get both Chat ID and Privacy setting in one call.
 */
export const getTelegramSettings = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        chatId: data.telegramChatId ? String(data.telegramChatId) : null,
        isPrivate: data.telegramPrivacy !== undefined ? !!data.telegramPrivacy : true,
      };
    }
  } catch {}
  return { chatId: null, isPrivate: true };
};

// ─── Internal send helper ─────────────────────────────────────────────────────

/**
 * Send a Telegram message to a specific chat ID.
 */
const sendTelegramMessage = async (chatId, text, extra = {}) => {
  if (!BOT_TOKEN || !chatId) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (err) {
    console.warn('[Telegram] Failed to send message:', err.message);
    return false;
  }
};

// ─── Premium UI Helpers ───────────────────────────────────────────────────────

const appKeyboard = (label = '✦ Open Discuss') => ({
  inline_keyboard: [[{ text: label, url: APP_URL }]],
});

// Premium symbols
const SYM = {
  HEADER: '✦',
  ITEM: '◈',
  ACTION: '❯',
  DIVIDER: '──────────────────',
};

// ─── Public notification senders ─────────────────────────────────────────────

/**
 * Notify a user of a new direct message.
 */
export const notifyTelegramDM = async (recipientUserId, senderName, content = '', isImage = false) => {
  console.log('[Telegram] Attempting notifyTelegramDM:', { recipientUserId, senderName, isImage });
  const { chatId, isPrivate } = await getTelegramSettings(recipientUserId);
  if (!chatId) {
    console.log('[Telegram] No chatId found for user:', recipientUserId);
    return;
  }

  const title = `<b>${SYM.HEADER} NEW DIRECT MESSAGE</b>`;
  const sender = `<b>@${senderName || 'Someone'}</b>`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Sent you a ${isImage ? 'photo' : 'message'}</i>`;
  } else {
    body = isImage 
      ? `${SYM.ITEM} 🖼️ <i>Sent a photo</i>` 
      : `${SYM.ITEM} ${content || '<i>(No content)</i>'}`;
  }

  const text = `${title}\n\n${sender}\n${body}\n\n${SYM.ACTION} Tap below to reply`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('💬 Open Messages') });
};

/**
 * Notify a user of a new message in a group chat.
 */
export const notifyTelegramGroupMessage = async (recipientUserId, groupName, senderName, content = '', isImage = false) => {
  console.log('[Telegram] Attempting notifyTelegramGroupMessage:', { recipientUserId, groupName, senderName, isImage });
  const { chatId, isPrivate } = await getTelegramSettings(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} GROUP MESSAGE</b>`;
  const meta = `<b>@${senderName || 'Someone'}</b> in <b>${groupName || 'a group'}</b>`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Posted a new ${isImage ? 'photo' : 'message'}</i>`;
  } else {
    body = isImage 
      ? `${SYM.ITEM} 🖼️ <i>Posted a photo</i>` 
      : `${SYM.ITEM} ${content || '<i>(No content)</i>'}`;
  }

  const text = `${title}\n\n${meta}\n${body}\n\n${SYM.ACTION} Open group to join conversation`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('💬 Open Group Chat') });
};

/**
 * Notify a user of a new comment on their post.
 */
export const notifyTelegramComment = async (recipientUserId, commenterName, content = '') => {
  const { chatId, isPrivate } = await getTelegramSettings(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} NEW COMMENT</b>`;
  const meta = `<b>@${commenterName || 'Someone'}</b> on your post`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Left a new comment</i>`;
  } else {
    body = `${SYM.ITEM} ${content || '<i>(No content)</i>'}`;
  }

  const text = `${title}\n\n${meta}\n${body}\n\n${SYM.ACTION} View interaction in app`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('💬 View Comment') });
};

/**
 * Notify a user of a new reply to their comment.
 */
export const notifyTelegramReply = async (recipientUserId, replierName, content = '') => {
  const { chatId, isPrivate } = await getTelegramSettings(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} NEW REPLY</b>`;
  const meta = `<b>@${replierName || 'Someone'}</b> replied to your comment`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Left a new reply</i>`;
  } else {
    body = `${SYM.ITEM} ${content || '<i>(No content)</i>'}`;
  }

  const text = `${title}\n\n${meta}\n${body}\n\n${SYM.ACTION} View reply in app`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('💬 View Reply') });
};

/**
 * Notify a user of a new like on their post or pulse.
 */
export const notifyTelegramLike = async (recipientUserId, likerName, type = 'post') => {
  const { chatId } = await getTelegramSettings(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} NEW LIKE</b>`;
  const isPulse = type === 'pulse';
  const meta = `<b>@${likerName || 'Someone'}</b> liked your ${isPulse ? 'pulse' : 'post'}`;
  
  const text = `${title}\n\n❤️ ${meta}\n\n${SYM.ACTION} Tap to view your ${isPulse ? 'pulse' : 'post'}`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard(`❤️ View ${isPulse ? 'Pulse' : 'Post'}`) });
};

/**
 * Notify a user of a new friend request.
 */
export const notifyTelegramFriendRequest = async (recipientUserId, senderName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} FRIEND REQUEST</b>`;
  const text = `${title}\n\n🤝 <b>@${senderName || 'Someone'}</b> wants to connect.\n\n${SYM.ACTION} View request in Profile`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('👥 View Requests') });
};

/**
 * Notify a user that their friend request was accepted.
 */
export const notifyTelegramFriendAccepted = async (recipientUserId, accepterName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} REQUEST ACCEPTED</b>`;
  const text = `${title}\n\n🎉 <b>@${accepterName || 'Someone'}</b> accepted your request.\n\n${SYM.ACTION} You are now connected!`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('🎉 View Profile') });
};

/**
 * Notify a user that their group join request was approved.
 */
export const notifyTelegramGroupJoinAccepted = async (recipientUserId, groupName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} ACCESS GRANTED</b>`;
  const text = `${title}\n\n✅ Your request to join <b>${groupName || 'the group'}</b> was approved.\n\n${SYM.ACTION} Welcome to the group!`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('✅ Open Group') });
};

export default {
  saveTelegramChatId,
  getTelegramChatId,
  removeTelegramChatId,
  saveTelegramPrivacy,
  getTelegramPrivacy,
  getTelegramSettings,
  notifyTelegramDM,
  notifyTelegramFriendRequest,
  notifyTelegramFriendAccepted,
  notifyTelegramGroupMessage,
  notifyTelegramGroupJoinAccepted,
  notifyTelegramComment,
  notifyTelegramReply,
  notifyTelegramLike,
};

