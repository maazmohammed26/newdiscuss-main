// Blink Database & Privacy Service
// Integrates view-once photo capture with Firebase Realtime Database (Third & Fourth instances)
// Handles atomic view-once claims, multi-recipient tracking, and 24-hour expiry lifecycle.
// NOTE: All Cloudinary asset deletion is handled strictly server-side via Cloud Functions.
// The browser NEVER possesses the Cloudinary API secret or generates destroy signatures.

import {
  thirdDatabase,
  ref as chatsRef,
  get as chatsGet,
  set as chatsSet,
  push as chatsPush,
  update as chatsUpdate,
  runTransaction as runChatsTransaction
} from './firebaseThird';

import {
  fourthDatabase,
  ref as groupsRef,
  get as groupsGet,
  set as groupsSet,
  push as groupsPush,
  update as groupsUpdate,
  runTransaction as runFourthTransaction
} from './firebaseFourth';

import { generateChatId, getOrCreateChat } from './chatsDb';
import { sendRemoteNotification } from './notificationTransport';

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
  return Boolean(message.viewed || message.claim?.claimedBy);
};

/**
 * Returns media payload for presentation in the viewer
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
 * Registers an uploaded Blink media item in the central registry for multi-recipient tracking
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
    throw err;
  }
};

const consumeRegistryRecipient = async (publicId, viewerId) => {
  if (!thirdDatabase || !publicId || !viewerId) return;
  const safeKey = sanitizeStorageKey(publicId);
  const registryRef = chatsRef(thirdDatabase, `blinkMediaRegistry/${safeKey}`);

  await runChatsTransaction(registryRef, (current) => {
    if (!current?.pendingRecipients?.[viewerId]) return;
    const pendingRecipients = { ...current.pendingRecipients };
    delete pendingRecipients[viewerId];
    const allViewed = Object.keys(pendingRecipients).length === 0;
    return {
      ...current,
      pendingRecipients: allViewed ? null : pendingRecipients,
      allViewed
    };
  });
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
      claim: null,
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
        text: 'Blink',
        sender: senderId,
        timestamp
      }
    });

    // Update userChats lists for both participants
    const senderChatRef = chatsRef(thirdDatabase, `userChats/${senderId}/${chatId}`);
    await chatsUpdate(senderChatRef, {
      otherUser: recipientId,
      lastMessage: 'Blink',
      lastMessageTime: timestamp,
      status: 'active'
    });

    const recipientChatRef = chatsRef(thirdDatabase, `userChats/${recipientId}/${chatId}`);
    const recipientChatSnap = await chatsGet(recipientChatRef);
    const curUnread = recipientChatSnap.exists() ? (recipientChatSnap.val().unreadCount || 0) : 0;
    await chatsUpdate(recipientChatRef, {
      otherUser: senderId,
      lastMessage: 'Blink',
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

    const groupRef = groupsRef(fourthDatabase, `groups/${groupId}`);
    const groupSnap = await groupsGet(groupRef);
    if (!groupSnap.exists()) throw new Error('Group not found');

    const group = groupSnap.val() || {};
    const members = group.members || {};
    const senderMembership = members[senderId];
    if (!senderMembership) throw new Error('You are not a member of this group');
    if (group.settings?.adminOnlyMessaging && senderMembership.role !== 'admin') {
      throw new Error('Only admins can send messages in this group');
    }
    const recipientIds = Object.keys(members).filter((memberId) => memberId !== senderId);

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

    // Register before publishing the message. This ensures every published
    // Blink with a Cloudinary asset is covered by the server purge lifecycle.
    if (mediaData.publicId) {
      await registerBlinkMedia({
        publicId: mediaData.publicId,
        url: mediaData.url,
        recipientIds,
        groupId,
        expiresAt
      });
    }

    await groupsSet(newMessageRef, message);

    // Update group's last message
    await groupsUpdate(groupRef, {
      lastMessage: {
        text: `${senderUsername || 'Someone'} sent a Blink`,
        sender: senderId,
        timestamp
      }
    });

    // Keep every member's group list current and deliver the same remote push
    // path used by normal group messages.
    const groupName = group.name || 'group';
    await Promise.all(Object.keys(members).map(async (memberId) => {
      const userGroupRef = groupsRef(fourthDatabase, `userGroups/${memberId}/${groupId}`);
      const userGroupSnap = await groupsGet(userGroupRef);
      const unreadCount = userGroupSnap.exists() ? (userGroupSnap.val().unreadCount || 0) : 0;
      await groupsUpdate(userGroupRef, {
        lastMessage: 'Blink',
        lastMessageTime: timestamp,
        ...(memberId === senderId ? {} : { unreadCount: unreadCount + 1 })
      });

      if (memberId !== senderId) {
        sendRemoteNotification(
          memberId,
          `New Blink in ${groupName}`,
          `@${senderUsername || 'Someone'} sent a private Blink photo`,
          { url: `/group/${groupId}`, type: 'blink_group' }
        );
      }
    }));

    return { id: newMessageRef.key, ...message };
  } catch (error) {
    console.error('Error sending group Blink:', error);
    throw error;
  }
};

/**
 * Atomically claims the view-once rights for a Blink photo.
 * Prevents race conditions across tabs, devices, double taps, or refreshes.
 * If another request has already claimed or viewed it, the transaction aborts
 * and returns { success: false, reason: 'ALREADY_VIEWED' }.
 * @param {Object} params
 * @param {string} params.chatId - Chat ID (for 1-on-1)
 * @param {string} params.groupId - Group ID (for group)
 * @param {string} params.messageId - Message ID
 * @param {string} params.viewerId - Current user ID
 * @param {boolean} params.isGroup - Group flag
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
export const claimBlinkView = async ({ chatId, groupId, messageId, viewerId, isGroup = false }) => {
  try {
    const timestamp = new Date().toISOString();

    if (isGroup && groupId) {
      if (!fourthDatabase) return { success: false, reason: 'DB_UNAVAILABLE' };

      // Verify expiration before claiming
      const msgRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}`);
      const msgSnap = await groupsGet(msgRef);
      if (!msgSnap.exists()) return { success: false, reason: 'NOT_FOUND' };
      const msgData = msgSnap.val();
      if (msgData.sender === viewerId) return { success: false, reason: 'SENDER_CANNOT_VIEW' };
      if (isBlinkExpired(msgData)) return { success: false, reason: 'EXPIRED' };

      const membershipRef = groupsRef(fourthDatabase, `groups/${groupId}/members/${viewerId}`);
      const membershipSnap = await groupsGet(membershipRef);
      if (!membershipSnap.exists()) return { success: false, reason: 'NOT_AUTHORIZED' };

      const viewRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}/viewedBy/${viewerId}`);
      
      const txResult = await runFourthTransaction(viewRef, (current) => {
        if (current !== null && current !== undefined) {
          // Already claimed or viewed by this specific member! Abort transaction
          return; // Returning undefined aborts in Firebase RTDB
        }
        return {
          claimedAt: timestamp,
          viewedAt: timestamp
        };
      });

      if (!txResult.committed) {
        return { success: false, reason: 'ALREADY_VIEWED' };
      }
      return { success: true };
    } else if (chatId) {
      if (!thirdDatabase) return { success: false, reason: 'DB_UNAVAILABLE' };

      // Verify expiration and current view state before claiming
      const msgRef = chatsRef(thirdDatabase, `messages/${chatId}/${messageId}`);
      const msgSnap = await chatsGet(msgRef);
      if (!msgSnap.exists()) return { success: false, reason: 'NOT_FOUND' };
      const msgData = msgSnap.val();
      if (msgData.sender === viewerId || (msgData.recipient && msgData.recipient !== viewerId)) {
        return { success: false, reason: 'NOT_AUTHORIZED' };
      }
      if (isBlinkExpired(msgData)) return { success: false, reason: 'EXPIRED' };
      if (msgData.viewed || (msgData.claim && msgData.claim.claimedBy)) {
        return { success: false, reason: 'ALREADY_VIEWED' };
      }

      const claimRef = chatsRef(thirdDatabase, `messages/${chatId}/${messageId}/claim`);
      
      const txResult = await runChatsTransaction(claimRef, (current) => {
        if (current !== null && current !== undefined) {
          // Already claimed or viewed in this chat! Abort transaction
          return;
        }
        return {
          claimedBy: viewerId,
          claimedAt: timestamp
        };
      });

      if (!txResult.committed) {
        return { success: false, reason: 'ALREADY_VIEWED' };
      }

      // Mark message viewed immediately in the database
      await chatsUpdate(msgRef, {
        viewed: true,
        viewedAt: timestamp
      });

      return { success: true };
    }

    return { success: false, reason: 'INVALID_PARAMETERS' };
  } catch (err) {
    console.error('Error in atomic claimBlinkView:', err);
    return { success: false, reason: err.message };
  }
};

/**
 * Marks a direct 1-on-1 Blink as consumed when the viewer manually closes it.
 * Nullifies the media payload in the database to prevent extraction.
 * Updates multi-recipient registry. Server handles physical Cloudinary deletion.
 * @param {string} chatId - Chat ID
 * @param {string} messageId - Blink Message ID
 * @param {string} viewerId - Current user ID
 * @param {string} [publicId] - Cloudinary publicId if known
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

    // 1. Mark message viewed and strip media payload from this chat record
    await chatsUpdate(msgRef, {
      viewed: true,
      viewedAt: new Date().toISOString(),
      media: null
    });

    // 2. Atomically update multi-recipient registry. Concurrent closes from
    // different recipients cannot overwrite each other's pending state.
    if (actualPublicId) {
      await consumeRegistryRecipient(actualPublicId, viewerId);
    }
  } catch (error) {
    console.error('Error marking Blink as viewed:', error);
  }
};

/**
 * Records view-once state for a group Blink when the viewer closes it.
 * Only marks that member; does not consume views for other group members.
 * @param {string} groupId - Group ID
 * @param {string} messageId - Message ID
 * @param {string} viewerId - Current user ID
 */
export const markGroupBlinkAsViewed = async (groupId, messageId, viewerId) => {
  try {
    if (!fourthDatabase) return;
    const msgRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}`);
    const msgSnap = await groupsGet(msgRef);
    if (!msgSnap.exists()) return;
    const msgData = msgSnap.val();
    if (msgData.sender === viewerId) return;

    const viewRef = groupsRef(fourthDatabase, `groups/${groupId}/messages/${messageId}/viewedBy/${viewerId}`);
    await groupsUpdate(viewRef, {
      viewedAt: new Date().toISOString()
    });

    if (msgData.media?.publicId) {
      await consumeRegistryRecipient(msgData.media.publicId, viewerId);
    }
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
 * Wipes expired media payload from RTDB record.
 * Physical Cloudinary asset destruction is executed server-side.
 * @param {Object} params
 * @param {string} params.id - Chat ID or Group ID
 * @param {string} params.messageId - Message ID
 * @param {boolean} params.isGroup - Whether it is a group
 */
export const purgeExpiredBlinkMedia = async ({ id, messageId, isGroup = false }) => {
  try {
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
    console.error('Error purging expired Blink media in RTDB:', error);
  }
};

/**
 * Scans registry and marks expired Blinks in RTDB.
 * Physical Cloudinary deletion with CDN cache invalidation is executed server-side.
 */
export const runRegistry24HourPurge = async () => {
  try {
    if (!thirdDatabase) return;
    const registryRef = chatsRef(thirdDatabase, 'blinkMediaRegistry');
    const snap = await chatsGet(registryRef);
    if (!snap.exists()) return;

    const registry = snap.val();
    const now = Date.now();
    const updates = {};

    for (const [key, item] of Object.entries(registry)) {
      if (item.expired) continue;
      const expireTime = item.expiresAt ? new Date(item.expiresAt).getTime() : 0;

      if (expireTime > 0 && now > expireTime) {
        updates[`${key}/expired`] = true;
        updates[`${key}/expiredAt`] = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length > 0) {
      await chatsUpdate(registryRef, updates);
    }
  } catch (err) {
    console.error('Error during 24-hour Blink registry status check:', err);
  }
};
