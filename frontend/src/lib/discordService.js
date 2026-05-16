// Discord Notification Service
// Sends notifications via the Discord Bot API.
// The user's Discord User ID is stored in Firebase RTDB (users/{uid}/discordUserId).

import { database, ref, update, remove, get } from './firebase';
import { invalidateUserCache } from './db';

// ─── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.REACT_APP_DISCORD_BOT_TOKEN || '';
export const BOT_USERNAME = 'Discuss Notification#4408'; // From user image

// URL users are directed to when they tap a link in a Discord notification
export const APP_URL = 'https://discussit.in/';

const DISCORD_API = 'https://discord.com/api/v10';

// ─── Firebase helpers ─────────────────────────────────────────────────────────

/**
 * Save a user's Discord User ID to Firebase.
 */
export const saveDiscordUserId = async (userId, discordId) => {
  const trimmed = String(discordId).trim();
  await update(ref(database, `users/${userId}`), { discordUserId: trimmed });
  invalidateUserCache(userId);
};

/**
 * Read a user's Discord User ID from Firebase.
 */
export const getDiscordUserId = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/discordUserId`));
    return snapshot.exists() ? String(snapshot.val()) : null;
  } catch {
    return null;
  }
};

/**
 * Remove a user's Discord User ID from Firebase.
 */
export const removeDiscordUserId = async (userId) => {
  await remove(ref(database, `users/${userId}/discordUserId`));
  invalidateUserCache(userId);
};

/**
 * Save a user's Discord Privacy setting.
 */
export const saveDiscordPrivacy = async (userId, isPrivate) => {
  await update(ref(database, `users/${userId}`), { discordPrivacy: !!isPrivate });
  invalidateUserCache(userId);
};

/**
 * Get a user's Discord Privacy setting.
 */
export const getDiscordPrivacy = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}/discordPrivacy`));
    return snapshot.exists() ? !!snapshot.val() : true;
  } catch {
    return true;
  }
};

/**
 * Get both User ID and Privacy setting in one call.
 */
export const getDiscordSettings = async (userId) => {
  try {
    const snapshot = await get(ref(database, `users/${userId}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        userId: data.discordUserId ? String(data.discordUserId) : null,
        isPrivate: data.discordPrivacy !== undefined ? !!data.discordPrivacy : true,
      };
    }
  } catch {}
  return { userId: null, isPrivate: true };
};

// ─── Internal send helper ─────────────────────────────────────────────────────

/**
 * Send a Discord DM to a specific user ID.
 */
const sendDiscordMessage = async (discordUserId, embed) => {
  if (!BOT_TOKEN || !discordUserId) return false;

  const isLocal = window.location.hostname === 'localhost';
  const proxyUrl = 'http://localhost:5000/notify-discord';

  try {
    if (isLocal) {
      // Use the local proxy to bypass CORS
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordUserId,
          embed,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: 'Open Discuss App',
                  style: 5,
                  url: APP_URL
                }
              ]
            }
          ]
        }),
      });
      const data = await res.json();
      return !!data.id;
    }

    // Standard Direct Path (Will likely fail with CORS in browser, kept for production reference)
    // 1. Create DM channel
    const channelRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    
    const channelData = await channelRes.json();
    if (!channelData.id) return false;

    // 2. Send message to channel
    const msgRes = await fetch(`${DISCORD_API}/channels/${channelData.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            color: 0x2563EB,
            timestamp: new Date().toISOString(),
            ...embed,
            footer: { text: 'Discuss App Notification' },
          }
        ],
        components: [
          {
            type: 1,
            components: [{ type: 2, label: 'Open Discuss App', style: 5, url: APP_URL }]
          }
        ]
      }),
    });
    
    const msgData = await msgRes.json();
    return !!msgData.id;
  } catch (err) {
    console.warn('[Discord] Failed to send message:', err.message);
    return false;
  }
};

// Premium symbols for text fallback
const SYM = {
  HEADER: '✦',
  ITEM: '◈',
  ACTION: '❯',
};

// ─── Public notification senders ─────────────────────────────────────────────

export const notifyDiscordDM = async (recipientUserId, senderName, content = '', isImage = false) => {
  const { userId, isPrivate } = await getDiscordSettings(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} NEW DIRECT MESSAGE`;
  const sender = `@${senderName || 'Someone'}`;
  
  let body = '';
  if (isPrivate) {
    body = `Sent you a ${isImage ? 'photo' : 'message'}`;
  } else {
    body = isImage ? '🖼️ Sent a photo' : content;
  }

  await sendDiscordMessage(userId, {
    title,
    description: `**${sender}**\n${body}`,
    fields: [
      { name: 'Action', value: `${SYM.ACTION} Tap button below to reply` }
    ]
  });
};

export const notifyDiscordGroupMessage = async (recipientUserId, groupName, senderName, content = '', isImage = false) => {
  const { userId, isPrivate } = await getDiscordSettings(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} GROUP MESSAGE`;
  const meta = `**@${senderName || 'Someone'}** in **${groupName || 'a group'}**`;
  
  let body = '';
  if (isPrivate) {
    body = `Posted a new ${isImage ? 'photo' : 'message'}`;
  } else {
    body = isImage ? '🖼️ Posted a photo' : content;
  }

  await sendDiscordMessage(userId, {
    title,
    description: `${meta}\n${body}`,
    fields: [
      { name: 'Action', value: `${SYM.ACTION} Open group to join conversation` }
    ]
  });
};

export const notifyDiscordComment = async (recipientUserId, commenterName, content = '') => {
  const { userId, isPrivate } = await getDiscordSettings(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} NEW COMMENT`;
  const meta = `**@${commenterName || 'Someone'}** on your post`;
  
  let body = isPrivate ? 'Left a new comment' : content;

  await sendDiscordMessage(userId, {
    title,
    description: `${meta}\n${body}`,
  });
};

export const notifyDiscordReply = async (recipientUserId, replierName, content = '') => {
  const { userId, isPrivate } = await getDiscordSettings(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} NEW REPLY`;
  const meta = `**@${replierName || 'Someone'}** replied to your comment`;
  
  let body = isPrivate ? 'Left a new reply' : content;

  await sendDiscordMessage(userId, {
    title,
    description: `${meta}\n${body}`,
  });
};

export const notifyDiscordLike = async (recipientUserId, likerName, type = 'post') => {
  const { userId } = await getDiscordSettings(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} NEW LIKE`;
  const isPulse = type === 'pulse';
  const meta = `**@${likerName || 'Someone'}** liked your ${isPulse ? 'pulse' : 'post'}`;
  
  await sendDiscordMessage(userId, {
    title,
    description: `❤️ ${meta}`,
  });
};

export const notifyDiscordFriendRequest = async (recipientUserId, requesterName) => {
  const userId = await getDiscordUserId(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} FRIEND REQUEST`;
  const meta = `**@${requesterName || 'Someone'}** wants to be your friend`;
  
  await sendDiscordMessage(userId, {
    title,
    description: meta,
  });
};

export const notifyDiscordFriendAccepted = async (recipientUserId, friendName) => {
  const userId = await getDiscordUserId(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} REQUEST ACCEPTED`;
  const meta = `**@${friendName || 'Someone'}** is now your friend`;
  
  await sendDiscordMessage(userId, {
    title,
    description: meta,
  });
};

export const notifyDiscordGroupJoinAccepted = async (recipientUserId, groupName) => {
  const userId = await getDiscordUserId(recipientUserId);
  if (!userId) return;

  const title = `${SYM.HEADER} ACCESS GRANTED`;
  const description = `✅ Your request to join **${groupName || 'the group'}** was approved.`;
  
  await sendDiscordMessage(userId, {
    title,
    description,
  });
};

export default {
  saveDiscordUserId,
  getDiscordUserId,
  removeDiscordUserId,
  saveDiscordPrivacy,
  getDiscordPrivacy,
  getDiscordSettings,
  notifyDiscordDM,
  notifyDiscordFriendRequest,
  notifyDiscordFriendAccepted,
  notifyDiscordGroupMessage,
  notifyDiscordGroupJoinAccepted,
  notifyDiscordComment,
  notifyDiscordReply,
  notifyDiscordLike,
};
