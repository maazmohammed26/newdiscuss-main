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

// ─── Admin Telegram Bot Config ───────────────────────────────────────────────
const ADMIN_BOT_TOKEN = process.env.REACT_APP_TELEGRAM_ADMIN_BOT_TOKEN || '';
const ADMIN_CHAT_ID   = process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID   || '';
const ADMIN_TELEGRAM_API = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}`;

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
 * Escapes special HTML characters for Telegram.
 */
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

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
  const sender = `<b>@${escapeHTML(senderName) || 'Someone'}</b>`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Sent you a ${isImage ? 'photo' : 'message'}</i>`;
  } else {
    body = isImage 
      ? `${SYM.ITEM} 🖼️ <i>Sent a photo</i>` 
      : `${SYM.ITEM} ${escapeHTML(content) || '<i>(No content)</i>'}`;
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
  const meta = `<b>@${escapeHTML(senderName) || 'Someone'}</b> in <b>${escapeHTML(groupName) || 'a group'}</b>`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Posted a new ${isImage ? 'photo' : 'message'}</i>`;
  } else {
    body = isImage 
      ? `${SYM.ITEM} 🖼️ <i>Posted a photo</i>` 
      : `${SYM.ITEM} ${escapeHTML(content) || '<i>(No content)</i>'}`;
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
  const meta = `<b>@${escapeHTML(commenterName) || 'Someone'}</b> on your post`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Left a new comment</i>`;
  } else {
    body = `${SYM.ITEM} ${escapeHTML(content) || '<i>(No content)</i>'}`;
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
  const meta = `<b>@${escapeHTML(replierName) || 'Someone'}</b> replied to your comment`;
  
  let body = '';
  if (isPrivate) {
    body = `${SYM.ITEM} <i>Left a new reply</i>`;
  } else {
    body = `${SYM.ITEM} ${escapeHTML(content) || '<i>(No content)</i>'}`;
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
  const meta = `<b>@${escapeHTML(likerName) || 'Someone'}</b> liked your ${isPulse ? 'pulse' : 'post'}`;
  
  const text = `${title}\n\n❤️ ${meta}\n\n${SYM.ACTION} Tap to view your ${isPulse ? 'pulse' : 'post'}`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard(`❤️ View ${isPulse ? 'Pulse' : 'Post'}`) });
};

/**
 * Notify a user of a new friend request.
 */
export const notifyTelegramFriendRequest = async (recipientUserId, requesterName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} FRIEND REQUEST</b>`;
  const meta = `<b>@${escapeHTML(requesterName) || 'Someone'}</b> wants to be your friend`;
  
  const text = `${title}\n\n${meta}\n\n${SYM.ACTION} Open app to accept or decline`;
  
  await sendTelegramMessage(chatId, text, { reply_markup: appKeyboard('👥 View Requests') });
};

/**
 * Notify a user that their friend request was accepted.
 */
export const notifyTelegramFriendAccepted = async (recipientUserId, friendName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;

  const title = `<b>${SYM.HEADER} REQUEST ACCEPTED</b>`;
  const meta = `<b>@${escapeHTML(friendName) || 'Someone'}</b> is now your friend`;
  
  const text = `${title}\n\n${meta}\n\n${SYM.ACTION} Start a conversation now!`;
  
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

export const notifyAdminUserSignup = async (username, userId, email) => {
  if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) return;

  const title = `<b>${SYM.HEADER} NEW USER SIGNUP</b>`;
  const formattedTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  const text = `${title}\n\n` +
    `◈ <b>Username:</b> @${escapeHTML(username)}\n` +
    `◈ <b>User ID:</b> <code>${escapeHTML(userId)}</code>\n` +
    `◈ <b>Email:</b> ${escapeHTML(email)}\n` +
    `◈ <b>Date & Time:</b> ${escapeHTML(formattedTime)}`;

  await sendAdminTelegramMessage(text);
};

export const notifyAdminReport = async ({
  reporterUsername,
  reporterId,
  reporterEmail,
  targetType,
  targetId,
  targetOwnerUsername,
  targetOwnerId,
  targetOwnerEmail,
  comment
}) => {
  if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) return;

  const title = `<b>🚨 ${SYM.HEADER} NEW COMMUNITY REPORT 🚨</b>`;
  const formattedTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  const text = `${title}\n\n` +
    `<b>👥 Reporter Profile:</b>\n` +
    `◈ <b>Username:</b> @${escapeHTML(reporterUsername)}\n` +
    `◈ <b>User ID:</b> <code>${escapeHTML(reporterId)}</code>\n` +
    `◈ <b>Email:</b> ${escapeHTML(reporterEmail || 'N/A')}\n\n` +
    `<b>🎯 Reported Content:</b>\n` +
    `◈ <b>Type:</b> <code>${escapeHTML(targetType.toUpperCase())}</code>\n` +
    `◈ <b>Content ID:</b> <code>${escapeHTML(targetId)}</code>\n\n` +
    `<b>👤 Content Owner:</b>\n` +
    `◈ <b>Username:</b> @${escapeHTML(targetOwnerUsername)}\n` +
    `◈ <b>User ID:</b> <code>${escapeHTML(targetOwnerId)}</code>\n` +
    `◈ <b>Email:</b> ${escapeHTML(targetOwnerEmail || 'N/A')}\n\n` +
    `<b>💬 Comment by Reporter:</b>\n` +
    `<i>"${escapeHTML(comment || '(No comment)')}"</i>\n\n` +
    `<b>📅 Reported At:</b> ${escapeHTML(formattedTime)}`;

  await sendAdminTelegramMessage(text);
};

const sendAdminTelegramMessage = async (text, extra = {}) => {
  if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn('[Telegram Admin] Missing config — BOT_TOKEN:', !!ADMIN_BOT_TOKEN, 'CHAT_ID:', !!ADMIN_CHAT_ID);
    return false;
  }

  try {
    console.log('[Telegram Admin] Sending message to chat:', ADMIN_CHAT_ID);
    const res = await fetch(`${ADMIN_TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram Admin] API error:', data.description, '| error_code:', data.error_code);
    } else {
      console.log('[Telegram Admin] Message sent successfully!');
    }
    return data.ok === true;
  } catch (err) {
    console.warn('[Telegram Admin] Failed to send message:', err.message);
    return false;
  }
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
  notifyAdminUserSignup,
  notifyAdminReport,
};

