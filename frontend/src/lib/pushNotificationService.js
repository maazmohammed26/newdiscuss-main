// Simple Push Notification Service - No Database Storage
// Just push notifications directly using Service Worker

// VAPID Public Key for Web Push
export const VAPID_PUBLIC_KEY = 'BD3rYWCGmkrNvyQ8t2GzPdnUySdy4WnEZwm51t_LLIApOK5iI2WQ15ckapmOQQplhiLA68_Ryyifq4ERe4UDTec';

// Local storage keys
const NOTIFICATION_ENABLED_KEY = 'discuss_notifications_enabled';
const CHAT_COOLDOWN_KEY = 'discuss_chat_cooldowns';
const SENT_NOTIFICATIONS_KEY = 'discuss_sent_notifications';

// Chat notification cooldown (2 hours in milliseconds)
const CHAT_NOTIFICATION_COOLDOWN = 2 * 60 * 60 * 1000;

// ============ HELPERS ============

// Convert VAPID key to Uint8Array
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Check if iOS
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Check if app is installed as PWA
export const isPWAInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
};

// Check iOS version
export const getIOSVersion = () => {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return 0;
};

// Check if push is available on this device
export const canUsePush = () => {
  if (!isPushSupported()) return false;
  if (isIOS()) {
    return isPWAInstalled() && getIOSVersion() >= 16.4;
  }
  return true;
};

// Get current permission status
export const getPermissionStatus = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

// ============ LOCAL STORAGE HELPERS ============

// Check if notifications are enabled for user
export const isNotificationsEnabled = () => {
  return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true' && 
         Notification.permission === 'granted';
};

// Set notification enabled status
export const setNotificationsEnabled = (enabled) => {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
};

// Check chat cooldown (4 hours)
export const canSendChatNotification = (chatId) => {
  try {
    const cooldowns = JSON.parse(localStorage.getItem(CHAT_COOLDOWN_KEY) || '{}');
    const lastSent = cooldowns[chatId] || 0;
    return (Date.now() - lastSent) >= CHAT_NOTIFICATION_COOLDOWN;
  } catch {
    return true;
  }
};

// Update chat cooldown
export const updateChatCooldown = (chatId) => {
  try {
    const cooldowns = JSON.parse(localStorage.getItem(CHAT_COOLDOWN_KEY) || '{}');
    cooldowns[chatId] = Date.now();
    localStorage.setItem(CHAT_COOLDOWN_KEY, JSON.stringify(cooldowns));
  } catch {}
};

// Check if notification was already sent (prevent duplicates)
export const wasNotificationSent = (type, id) => {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_NOTIFICATIONS_KEY) || '{}');
    return sent[`${type}_${id}`] === true;
  } catch {
    return false;
  }
};

// Mark notification as sent
export const markNotificationSent = (type, id) => {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_NOTIFICATIONS_KEY) || '{}');
    sent[`${type}_${id}`] = true;
    // Keep only last 100 entries
    const keys = Object.keys(sent);
    if (keys.length > 100) {
      keys.slice(0, keys.length - 100).forEach(k => delete sent[k]);
    }
    localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(sent));
  } catch {}
};

// ============ PERMISSION & REGISTRATION ============

// Request notification permission
export const requestPermission = async () => {
  if (!isPushSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return 'denied';
  }
};

// Register for push notifications
export const registerPushSubscription = async () => {
  if (!canUsePush()) return null;
  
  try {
    // Check permission first
    if (Notification.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') return null;
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // Create new subscription if none exists
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    
    setNotificationsEnabled(true);
    return subscription;
  } catch (error) {
    console.error('Error registering push subscription:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribePush = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }
    
    setNotificationsEnabled(false);
    return true;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return false;
  }
};

// ============ SHOW NOTIFICATIONS ============

// Show notification via service worker
export const showNotification = async (title, options = {}) => {
  if (Notification.permission !== 'granted') return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/favicon-new.png',
      badge: '/favicon-new.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    });
    return true;
  } catch (error) {
    // Fallback to regular notification
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
};

// ============ NOTIFICATION TRIGGERS ============

// Notify new post (no duplicates)
export const notifyNewPost = async (post) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('post', post.id)) return;
  
  await showNotification('New on Discuss', {
    body: post.type === 'project'
      ? `New project: ${(post.title || '').substring(0, 50) || 'Check it out!'}`
      : `New discussion: ${(post.content || '').substring(0, 50) || 'Join the conversation!'}`,
    tag: `post-${post.id}`,
    data: { url: `/post/${post.id}`, type: 'post' }
  });
  
  markNotificationSent('post', post.id);
};

// Notify chat message (4-hour cooldown)
export const notifyChatMessage = async (chatId, senderName) => {
  if (!isNotificationsEnabled()) return;
  if (!canSendChatNotification(chatId)) return;
  
  await showNotification('New message in your chat', {
    body: senderName ? `${senderName} sent you a message` : 'You have a new message',
    tag: `chat-${chatId}`,
    data: { url: `/chat/${chatId}`, type: 'chat' }
  });
  
  updateChatCooldown(chatId);
};

// Notify friend request
export const notifyFriendRequest = async (fromUserId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('friend_request', fromUserId)) return;
  
  await showNotification('New Friend Request', {
    body: `${fromUsername || 'Someone'} wants to connect with you`,
    tag: `friend-request-${fromUserId}`,
    data: { url: '/profile', type: 'friend' }
  });
  
  markNotificationSent('friend_request', fromUserId);
};

// Notify friend accepted
export const notifyFriendAccepted = async (fromUserId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('friend_accepted', fromUserId)) return;
  
  await showNotification('Friend Request Accepted', {
    body: `${fromUsername || 'Someone'} accepted your friend request`,
    tag: `friend-accepted-${fromUserId}`,
    data: { url: `/user/${fromUserId}`, type: 'friend' }
  });
  
  markNotificationSent('friend_accepted', fromUserId);
};

// Notify new group message
export const notifyGroupMessage = async (groupId, groupName, senderName) => {
  if (!isNotificationsEnabled()) return;
  if (!canSendChatNotification(groupId)) return;
  
  await showNotification(`New message in ${groupName || 'group'}`, {
    body: senderName ? `${senderName} sent a message` : 'You have a new group message',
    tag: `group-chat-${groupId}`,
    data: { url: `/group/${groupId}`, type: 'group_chat' }
  });
  
  updateChatCooldown(groupId);
};

// Notify group join request
export const notifyGroupJoinRequest = async (groupId, groupName, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent(`group_request_${groupId}`, fromUsername)) return;
  
  await showNotification('New Group Join Request', {
    body: `${fromUsername || 'Someone'} requested to join ${groupName || 'your group'}`,
    tag: `group-request-${groupId}-${fromUsername}`,
    data: { url: `/join-requests`, type: 'group_request' }
  });
  
  markNotificationSent(`group_request_${groupId}`, fromUsername);
};

// Notify group request accepted
export const notifyGroupRequestAccepted = async (groupId, groupName) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('group_accepted', groupId)) return;
  
  await showNotification('Group Request Accepted', {
    body: `Your request to join ${groupName || 'the group'} was accepted`,
    tag: `group-accepted-${groupId}`,
    data: { url: `/group/${groupId}`, type: 'group' }
  });
  
  markNotificationSent('group_accepted', groupId);
};

// Notify new comment
export const notifyNewComment = async (postId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('comment', postId)) return;
  
  await showNotification('New Comment', {
    body: `${fromUsername || 'Someone'} commented on your post`,
    tag: `comment-${postId}`,
    data: { url: `/post/${postId}`, type: 'comment' }
  });
  
  markNotificationSent('comment', postId);
};

export default {
  isPushSupported,
  isIOS,
  isPWAInstalled,
  canUsePush,
  getPermissionStatus,
  isNotificationsEnabled,
  requestPermission,
  registerPushSubscription,
  unsubscribePush,
  showNotification,
  notifyNewPost,
  notifyChatMessage,
  notifyFriendRequest,
  notifyFriendAccepted
};
