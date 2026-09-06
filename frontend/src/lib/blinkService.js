// Blink Database & Privacy Service
// Integrates view-once photo capture with Firebase Realtime Database (Third & Fourth instances)
// Handles multi-recipient tracking, view-once consumption, 24-hour expiry purge, and Cloudinary storage deletion.

import {
  thirdDatabase,
  ref as chatsRef,
  get as chatsGet,
  set as chatsSet,
  push as chatsPush,
  update as chatsUpdate
} from './firebaseThird';

import {
  fourthDatabase,
  ref as groupsRef,
  get as groupsGet,
  set as groupsSet,
  push as groupsPush,
  update as groupsUpdate
} from './firebaseFourth';

import { generateChatId, getOrCreateChat } from './chatsDb';
import { deleteImage } from './cloudinary';
import { sendRemoteNotification } from './notificationTransport';
import { notifyChatMessage } from './pushNotificationService';

export const BLINK_EXPIRY_HOURS = 24;

/**
 * Sanitizes a Cloudinary publicId for safe use as a Firebase Realtime Database key
 * @param {string} publicId
 * @returns {string}
 */
export const sanitizeStorageKey = (publicId) => {
  if (!publicId) return `blink_${Date.now()}`;
  return publicId.replace(/[.#$/[\]]+/g, '___');
};


/**
 * Checks if a Blink message has expired based on its 24-hour availability window
 * @param {Object} message - Blink message object
 * @returns {boolean}
 */
export const isBlinkExpired = (message) => {
  if (!message) return true;
  if (message.expired) return true;
  if (!message.expiresAt && !message.timestamp) return false;
  
  const expireTime = message.expiresAt 
    ? new Date(message.expiresAt).getTime()
    : new Date(message.timestamp).getTime() + BLINK_EXPIRY_HOURS * 60 * 60 * 1000;

  return Date.now() > expireTime;
};

/**
 * Checks if a Blink message has already been viewed by the current user
 * @param {Object} message - Blink message object
 * @param {string} userId - Current user ID
 * @param {boolean} isGroup - Whether this message belongs to a group chat
 * @returns {boolean}
 */
export const isBlinkViewed = (message, userId, isGroup = false) => {
  if (!message) return true;
  if (isGroup) {
    return Boolean(message.viewedBy && message.viewedBy[userId]);
  }
  return Boolean(message.viewed);
};

/**
 * Returns media payload for presentation in the viewer
 * Note: Transparently handles the storage URL without misleading encryption claims.
 * @param {Object} media - Media object { url, thumbnail, publicId, ... }
 * @returns {Object|null}
 */
export const getDecryptedBlinkMedia = (media) => {
  if (!media || !media.url) return null;
  return {
    ...media,
    url: media.url,
    thumbnail: media.thumbnail || media.url
  };
};

/**
 * Registers an uploaded Blink media item in the central registry for multi-recipient tracking and storage deletion
 * @param {Object} params
 * @param {string} params.publicId - Cloudinary public ID
 * @param {string} params.url - Cloudinary URL
 * @param {Array<string>} params.recipientIds - Array of recipient user IDs (for DMs)
 * @param {string|null} params.groupId - Group ID if sent to group
 * @param {string} params.expiresAt - ISO expiration timestamp
 */
export const registerBlinkMedia = async ({ publicId, url, recipientIds = [], groupId = null, expiresAt }) => {
  try {
    if (!thirdDatabase || !publicId) return;
    const safeKey = sanitizeStorageKey(publicId);
    const registryRef = chatsRef(thirdDatabase, `blinkMediaRegistry/${safeKey}`);

    const pendingMap = {};
    recipientIds.forEach((id) => {
      pendingMap[id] = true;
    });

    await chatsSet(registryRef, {
      publicId,
      url,
      createdAt: new Date().toISOString(),
      expiresAt,
      groupId: groupId || null,
      pendingRecipients: pendingMap,
      deletedFromCloudinary: false
    });
  } catch (err) {
    console.error('Error registering Blink media in registry:', err);
  }
};

/**
 * Sends a view-once Blink to a single friend via direct chat
 * @param {Object} params
 * @param {string} params.senderId - Current user ID
 * @param {string} params.senderUsername - Current user username
 * @param {string} params.recipientId - Recipient friend user ID
 * @param {Object} params.mediaData - { url, publicId, width, height, thumbnail }
 * @param {string} [params.expiresAt] - Shared expiration timestamp for multi-recipient batches
 */
export const sendDirectBlink = async ({ senderId, senderUsername, recipientId, mediaData, expiresAt = null }) => {
  try {
    if (!thirdDatabase) throw new Error('Chats database not initialized');
    
    // Ensure chat exists
    const chat = await getOrCreateChat(senderId, recipientId);
    const chatId = chat.id || generateChatId(senderId, recipientId);
    
    const timestamp = new Date().toISOString();
    const expiry = expiresAt || new Date(Date.now() + BLINK_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    
    const messagesListRef = chatsRef(thirdDatabase, `messages/${chatId}`);
    const newMessageRef = chatsPush(messagesListRef);
    
    const message = {
      type: 'blink',
      sender: senderId,
      recipient: recipientId,
      timestamp,
      expiresAt: expiry,
      media: {
        url: mediaData.url,
        thumbnail: mediaData.thumbnail || mediaData.url,
        publicId: mediaData.publicId || '',
        width: mediaData.width || 1080,
        height: mediaData.height || 1920
      },
      viewed: false,
      viewedAt: null,
      status: 'sent',
      screenshotTaken: false,
      screenshotBy: null,
      screenshotAt: null
    };

    await chatsSet(newMessageRef, message);

    // Update chat last message
    const chatRef = chatsRef(thirdDatabase, `chats/${chatId}`);
    await chatsUpdate(chatRef, {
      lastMessage: {
        text: '📸 Blink',
        sender: senderId,
        timestamp
      }
    });

    // Update userChats lists for both participants
    const senderChatRef = chatsRef(thirdDatabase, `userChats/${senderId}/${chatId}`);
    await chatsUpdate(senderChatRef, {
      otherUser: recipientId,
      lastMessage: '📸 Blink',
      lastMessageTime: timestamp,
      status: 'active'
    });

    const recipientChatRef = chatsRef(thirdDatabase, `userChats/${recipientId}/${chatId}`);
    const recipientChatSnap = await chatsGet(recipientChatRef);
    const curUnread = recipientChatSnap.exists() ? (recipientChatSnap.val().unreadCount || 0) : 0;
    await chatsUpdate(recipientChatRef, {
      otherUser: senderId,
      lastMessage: '📸 Blink',
      lastMessageTime: timestamp,
      unreadCount: curUnread + 1,
      status: 'active'
    });

    // Dispatch notifications
    sendRemoteNotification(
      recipientId,
      'New Blink',
      `@${senderUsername || 'A friend'} sent you a private Blink photo`,
      { url: `/chat/${senderId}`, type: 'blink' }
    );

    notifyChatMessage(recipientId, senderUsername, '📸 Sent a private Blink');

    return { id: newMessageRef.key, ...message };
  } catch (error) {
    console.error('Error sending direct Blink:', error);
    throw error;
  }
};

/**
 * Sends a view-once Blink to an existing group chat
 * @param {Object} params
 * @param {string} params.groupId - Target group ID
 * @param {string} params.senderId - Current user ID
 * @param {string} params.senderUsername - Current user username
 * @param {Object} params.mediaData - { url, publicId, width, height, thumbnail }
 */
export const sendGroupBlink = async ({ groupId, senderId, senderUsername, mediaData }) => {
  try {
    if (!fourthDatabase) throw new Error('Groups database not initialized');

    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + BLINK_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const groupMessagesRef = groupsRef(fourthDatabase, `groups/${groupId}/messages`);
    const newMessageRef = groupsPush(groupMessagesRef);

    const message = {
      type: 'blink',
      sender: senderId,
      senderName: senderUsername || 'Someone',
      timestamp,
      expiresAt,
      media: {
        url: mediaData.url,
        thumbnail: mediaData.thumbnail || mediaData.url,
        publicId: mediaData.publicId || '',
        width: mediaData.width || 1080,
        height: mediaData.height || 1920
      },
      viewedBy: {},
      screenshots: {},
      status: 'sent'
    };

    await groupsSet(newMessageRef, message);

    // Register in central registry for 24-hour Cloudinary deletion
    if (mediaData.publicId) {
      await registerBlinkMedia({
        publicId: mediaData.publicId,
        url: mediaData.url,
        groupId,
        expiresAt
      });
    }

    // Update group's last message
    const groupMetaRef = groupsRef(fourthDatabase, `groups/${groupId}`);
    await groupsUpdate(groupMetaRef, {
      lastMessage: {
        text: `📸 ${senderUsername || 'Someone'} sent a Blink`,
        sender: senderId,
        timestamp
      }
    });

    return { id: newMessageRef.key, ...message };
  } catch (error) {
    console.error('Error sending group Blink:', error);
    throw error;
  }
};

/**
 * Marks a direct 1-on-1 Blink as viewed by the recipient.
 * Ensures the viewing recipient is permanently blocked from reopening.
 * Removes the recipient from pending recipients in registry.
 * If all recipients of this media have viewed it, permanently deletes the image from Cloudinary storage.
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Blink Message ID
 * @param {string} viewerId - Current user ID
 * @param {string} publicId - Cloudinary publicId if known
 */
export const markBlinkAsViewed = async (chatId, messageId, viewerId, publicId = null) => {
  try {
    if (!thirdDatabase) return;
    const msgRef = chatsRef(thirdDatabase, `messages/${chatId}/${messageId}`);
    const snap = await chatsGet(msgRef);
    if (!snap.exists()) return;
    
    const msgData = snap.val();
    if (msgData.sender === viewerId) return;

    const actualPublicId = publicId || msgData.media?.publicId;

    // 1. Mark message as viewed & remove media payload for this specific chat
    await chatsUpdate(msgRef, {
      viewed: true,
      viewedAt: new Date().toISOString(),
      media: null
    });

    // 2. Multi-recipient registry check: check if all recipients have viewed
    if (actualPublicId) {
      const safeKey = sanitizeStorageKey(actualPublicId);
      const registryRef = chatsRef(thirdDatabase, `blinkMediaRegistry/${safeKey}`);
      const regSnap = await chatsGet(registryRef);

      if (regSnap.exists()) {
        const regData = regSnap.val();
        const pending = regData.pendingRecipients || {};
        delete pending[viewerId];

        const remainingPendingCount = Object.keys(pending).length;

        if (remainingPendingCount === 0 && !regData.deletedFromCloudinary) {
          // All intended recipients have viewed! Permanently destroy image from Cloudinary
          await deleteImage(actualPublicId);
          await chatsUpdate(registryRef, {
            pendingRecipients: null,
            deletedFromCloudinary: true,
            deletedAt: new Date().toISOString()
          });
        } else {
          // Update remaining pending list
          await chatsUpdate(registryRef, {
            pendingRecipients: remainingPendingCount > 0 ? pending : null
          });
        }
      }
    }
  } catch (error) {
    console.error('Error marking Blink as viewed:', error);
  }
};

/**
 * Marks a group Blink as viewed by a specific member.
 * Records the member's view in `viewedBy`.
 * Only blocks that specific member; does not remove access for other group members.
 * @param {string} groupId - Group ID
 * @param {string} messageId - Message ID
 * @param {string} viewerId - Current user ID
 */
export const markGroupBlinkAsViewed = async (groupId, messageId, viewerId) => {
  try {
    if (!fourthDatabase) return;
    const viewRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}/viewedBy/${viewerId}`);
    await groupsSet(viewRef, {
      viewedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error marking group Blink as viewed:', error);
  }
};

/**
 * Records best-effort screenshot detection signal for a Blink message.
 * Note: Browser/PWA cannot guarantee screenshot detection. This is strictly a best-effort signal.
 * Notification text to sender: "[username] may have captured your Blink."
 * @param {Object} params
 * @param {string} params.chatId - Chat ID (for 1-on-1)
 * @param {string} params.groupId - Group ID (for group)
 * @param {string} params.messageId - Message ID
 * @param {string} params.viewerId - User ID who triggered signal
 * @param {string} params.viewerUsername - User username
 * @param {boolean} params.isGroup - Whether it's a group
 */
export const recordBlinkScreenshot = async ({
  chatId,
  groupId,
  messageId,
  viewerId,
  viewerUsername,
  isGroup = false
}) => {
  try {
    const timestamp = new Date().toISOString();
    const displayNotice = `${viewerUsername || 'A recipient'} may have captured your Blink.`;

    if (isGroup && groupId) {
      if (!fourthDatabase) return;
      const ssRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}/screenshots/${viewerId}`);
      await groupsSet(ssRef, {
        username: viewerUsername || 'A member',
        notice: displayNotice,
        timestamp
      });
    } else if (chatId) {
      if (!thirdDatabase) return;
      const msgRef = chatsRef(thirdDatabase, `messages/${chatId}/${messageId}`);
      await chatsUpdate(msgRef, {
        screenshotTaken: true,
        screenshotBy: viewerUsername || 'Recipient',
        screenshotNotice: displayNotice,
        screenshotAt: timestamp
      });
    }
  } catch (error) {
    console.error('Error recording best-effort Blink screenshot signal:', error);
  }
};

/**
 * Purges expired Blink media from database and permanently destroys image from Cloudinary storage
 * @param {Object} params
 * @param {string} params.id - Chat ID or Group ID
 * @param {string} params.messageId - Message ID
 * @param {string} params.publicId - Cloudinary publicId
 * @param {boolean} params.isGroup - Whether it is a group
 */
export const purgeExpiredBlinkMedia = async ({ id, messageId, publicId, isGroup = false }) => {
  try {
    // 1. Physically destroy image from Cloudinary storage
    if (publicId) {
      await deleteImage(publicId);
      if (thirdDatabase) {
        const safeKey = sanitizeStorageKey(publicId);
        const regRef = chatsRef(thirdDatabase, `blinkMediaRegistry/${safeKey}`);
        await chatsUpdate(regRef, {
          deletedFromCloudinary: true,
          deletedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // 2. Wipe media payload in database message record
    const updates = {
      media: null,
      expired: true,
      expiredAt: new Date().toISOString()
    };

    if (isGroup) {
      if (!fourthDatabase) return;
      const msgRef = groupsRef(fourthDatabase, `groups/${id}/messages/${messageId}`);
      await groupsUpdate(msgRef, updates);
    } else {
      if (!thirdDatabase) return;
      const msgRef = chatsRef(thirdDatabase, `messages/${id}/${messageId}`);
      await chatsUpdate(msgRef, updates);
    }
  } catch (error) {
    console.error('Error purging expired Blink media:', error);
  }
};

/**
 * Scans registry and purges any Blink media that has exceeded the 24-hour expiration window.
 * Ensures images do not remain indefinitely in Cloudinary storage even if recipients never open them.
 */
export const runRegistry24HourPurge = async () => {
  try {
    if (!thirdDatabase) return;
    const registryRef = chatsRef(thirdDatabase, 'blinkMediaRegistry');
    const snap = await chatsGet(registryRef);
    if (!snap.exists()) return;

    const registry = snap.val();
    const now = Date.now();
    const purgePromises = [];

    for (const [key, item] of Object.entries(registry)) {
      if (item.deletedFromCloudinary) continue;
      const expireTime = item.expiresAt ? new Date(item.expiresAt).getTime() : 0;

      if (expireTime > 0 && now > expireTime) {
        purgePromises.push(
          (async () => {
            if (item.publicId) {
              await deleteImage(item.publicId);
            }
            const itemRef = chatsRef(thirdDatabase, `blinkMediaRegistry/${key}`);
            await chatsUpdate(itemRef, {
              deletedFromCloudinary: true,
              deletedAt: new Date().toISOString()
            });
          })()
        );
      }
    }

    await Promise.all(purgePromises);
  } catch (err) {
    console.error('Error during 24-hour Blink registry purge:', err);
  }
};
