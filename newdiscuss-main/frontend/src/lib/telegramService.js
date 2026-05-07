// Telegram Notification Service
// Sends notifications via the Telegram Bot API directly from the browser.
// The user's Telegram Chat ID is stored in Firebase RTDB (users/{uid}/telegramChatId).
// Notification message content is NEVER stored in Firebase.
//
// Setup (one-time, owner/admin):
//   1. Create a bot via @BotFather on Telegram → get BOT_TOKEN
//   2. Set REACT_APP_TELEGRAM_BOT_TOKEN in your .env / Netlify env vars
//   3. Set REACT_APP_TELEGRAM_BOT_USERNAME  (e.g. DiscussNotifications_bot)
//
// User setup (each user):
//   1. Open Telegram, search for the bot, click Start
//   2. Follow the bot's instructions to get their Chat ID
//   3. Paste the Chat ID in Profile → Telegram Notifications

import { database, ref, update, remove, get } from './firebase';
import { invalidateUserCache } from './db';

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN    = process.env.REACT_APP_TELEGRAM_BOT_TOKEN    || '';
export const BOT_USERNAME = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'DiscussNotifications_bot';

// URL users are directed to when they tap a link in a Telegram notification
export const APP_URL = 'https://dsscus.netlify.app/';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Firebase helpers (store only Chat ID, never message content) ─────────────

/**
 * Save a user's Telegram Chat ID to Firebase.
 * Stored at: users/{userId}/telegramChatId
 */
export const saveTelegramChatId = async (userId, chatId) => {
  const trimmed = String(chatId).trim();
  await update(ref(database, `users/${userId}`), { telegramChatId: trimmed });
  invalidateUserCache(userId);
};

/**
 * Read a user's Telegram Chat ID from Firebase.
 * Returns the chat ID string, or null if not set.
 */
export const getTelegramChatId = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/telegramChatId`));
    if (snapshot.exists()) {
      const val = snapshot.val();
      return val ? String(val) : null;
    }
    return null;
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

// ─── Internal send helper ─────────────────────────────────────────────────────

/**
 * Send a Telegram message to a specific chat ID.
 * @param {string} chatId   - Telegram chat ID of the recipient
 * @param {string} text     - Message text (HTML formatted)
 * @param {object} [extra]  - Extra Telegram API params (e.g. reply_markup)
 * @returns {Promise<boolean>} true if sent successfully
 */
const sendTelegramMessage = async (chatId, text, extra = {}) => {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] Bot token not configured. Set REACT_APP_TELEGRAM_BOT_TOKEN.');
    return false;
  }
  if (!chatId) return false;

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
    if (!data.ok) {
      console.warn('[Telegram] API error:', data.description);
    }
    return data.ok === true;
  } catch (err) {
    console.warn('[Telegram] Failed to send message:', err.message);
    return false;
  }
};

// ─── Inline keyboard with app deep-link ──────────────────────────────────────

const appKeyboard = (label = '🔗 Open Discuss') => ({
  inline_keyboard: [[{ text: label, url: APP_URL }]],
});

// ─── Public notification senders ─────────────────────────────────────────────

/**
 * Notify a user of a new direct message.
 * Called on the SENDER's device right after the message is stored.
 * @param {string} recipientUserId - Firebase UID of the message recipient
 * @param {string} senderName      - Username of the sender
 */
export const notifyTelegramDM = async (recipientUserId, senderName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `💬 <b>New Message on Discuss</b>\n\n<b>@${senderName || 'Someone'}</b> sent you a message.\n\nTap below to open the app and reply.`,
    { reply_markup: appKeyboard('💬 Open Messages') }
  );
};

/**
 * Notify a user of a new friend request.
 * @param {string} recipientUserId - Firebase UID of the user receiving the request
 * @param {string} senderName      - Username of the requester
 */
export const notifyTelegramFriendRequest = async (recipientUserId, senderName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `👥 <b>New Friend Request on Discuss</b>\n\n<b>@${senderName || 'Someone'}</b> wants to connect with you.`,
    { reply_markup: appKeyboard('👥 View Friend Requests') }
  );
};

/**
 * Notify a user that their friend request was accepted.
 * @param {string} recipientUserId - Firebase UID of the user who sent the original request
 * @param {string} accepterName    - Username of the user who accepted
 */
export const notifyTelegramFriendAccepted = async (recipientUserId, accepterName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `🎉 <b>Friend Request Accepted on Discuss</b>\n\n<b>@${accepterName || 'Someone'}</b> accepted your friend request. You are now connected!`,
    { reply_markup: appKeyboard('🎉 View Profile') }
  );
};

/**
 * Notify a user of a new message in a group chat.
 * @param {string} recipientUserId - Firebase UID of the recipient
 * @param {string} groupName       - Name of the group
 * @param {string} senderName      - Username of the message sender
 */
export const notifyTelegramGroupMessage = async (recipientUserId, groupName, senderName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `💬 <b>New Group Message on Discuss</b>\n\n<b>@${senderName || 'Someone'}</b> posted in <b>${groupName || 'a group'}</b>.`,
    { reply_markup: appKeyboard('💬 Open Group Chat') }
  );
};

/**
 * Notify a user that their group join request was approved.
 * @param {string} recipientUserId - Firebase UID of the user whose request was approved
 * @param {string} groupName       - Name of the group
 */
export const notifyTelegramGroupJoinAccepted = async (recipientUserId, groupName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `✅ <b>Group Request Approved on Discuss</b>\n\nYour request to join <b>${groupName || 'the group'}</b> has been approved. Welcome!`,
    { reply_markup: appKeyboard('✅ Open Group') }
  );
};

/**
 * Notify a user of a new comment on their post.
 * @param {string} recipientUserId - Firebase UID of the post owner
 * @param {string} commenterName   - Username of the commenter
 */
export const notifyTelegramComment = async (recipientUserId, commenterName) => {
  const chatId = await getTelegramChatId(recipientUserId);
  if (!chatId) return;
  await sendTelegramMessage(
    chatId,
    `💬 <b>New Comment on Discuss</b>\n\n<b>@${commenterName || 'Someone'}</b> commented on your post.`,
    { reply_markup: appKeyboard('💬 View Comment') }
  );
};

export default {
  saveTelegramChatId,
  getTelegramChatId,
  removeTelegramChatId,
  notifyTelegramDM,
  notifyTelegramFriendRequest,
  notifyTelegramFriendAccepted,
  notifyTelegramGroupMessage,
  notifyTelegramGroupJoinAccepted,
  notifyTelegramComment,
};
