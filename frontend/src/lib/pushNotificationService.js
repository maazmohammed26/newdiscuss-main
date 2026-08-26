// Simple Push Notification Service - No Database Storage
// Just push notifications directly using Service Worker

// VAPID Public Key for Web Push
export const VAPID_PUBLIC_KEY = 'BD3rYWCGmkrNvyQ8t2GzPdnUySdy4WnEZwm51t_LLIApOK5iI2WQ15ckapmOQQplhiLA68_Ryyifq4ERe4UDTec';

// Local storage keys
const NOTIFICATION_ENABLED_KEY = 'discuss_notifications_enabled';
const NOTIFICATION_PREVIEW_KEY = 'discuss_notification_preview_enabled';
const CHAT_COOLDOWN_KEY = 'discuss_chat_cooldowns';
const SENT_NOTIFICATIONS_KEY = 'discuss_sent_notifications';
const ONESIGNAL_APP_ID = '280791b6-7711-4b32-8897-449efe155f2b';
let oneSignalWebReady = null;

const isMedianApp = () => typeof window !== 'undefined' && Boolean(window.median?.onesignal);

const ensureOneSignalWeb = () => {
  if (typeof window === 'undefined' || isMedianApp()) return Promise.resolve(null);
  if (oneSignalWebReady) return oneSignalWebReady;

  oneSignalWebReady = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('OneSignal Web initialization timed out.')), 15000);
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/push/onesignal/' },
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: window.location.hostname === 'localhost',
        });
        window.clearTimeout(timeout);
        resolve(OneSignal);
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    });

    if (!document.querySelector('script[data-discuss-onesignal]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.dataset.discussOnesignal = 'true';
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('OneSignal Web SDK could not be loaded.'));
      };
      document.head.appendChild(script);
    }
  }).catch((error) => {
    oneSignalWebReady = null;
    throw error;
  });

  return oneSignalWebReady;
};

// Chat notification cooldown (2 hours in milliseconds)
const CHAT_NOTIFICATION_COOLDOWN = 2 * 60 * 60 * 1000;

// ============ HELPERS ============

// Formats the notification body text based on preview preferences and cuts off at max 6 lines
export const formatBodyForPreview = (bodyText, isPreview) => {
  if (!isPreview) {
    return "New secure alert received. Open app to view.";
  }
  if (!bodyText) return "";
  const lines = bodyText.split('\n');
  if (lines.length > 6) {
    return lines.slice(0, 6).join('\n') + '\n... open in app';
  }
  return bodyText;
};


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
  if (isMedianApp()) {
    return true; // Supported natively via OneSignal in Android APK
  }
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Check if iOS
export const isIOS = () => {
  return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Check if app is installed as PWA
export const isPWAInstalled = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
};

// Check iOS version
export const getIOSVersion = () => {
  if (typeof window === 'undefined') return 0;
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`);
  }
  return 0;
};

// Check if push is available on this device
export const canUsePush = () => {
  if (isMedianApp()) {
    return true;
  }
  if (!isPushSupported()) return false;
  if (isIOS()) {
    return isPWAInstalled() && getIOSVersion() >= 16.4;
  }
  return true;
};

// Get current permission status
export const getPermissionStatus = () => {
  if (isMedianApp()) {
    return 'granted';
  }
  if (!isPushSupported()) return 'unsupported';
  return 'Notification' in window ? Notification.permission : 'denied';
};

// ============ LOCAL STORAGE HELPERS ============

// Check if notifications are enabled for user
export const isNotificationsEnabled = () => {
  if (isMedianApp()) {
    return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true';
  }
  return typeof window !== 'undefined' && 
         localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true' && 
         'Notification' in window && 
         Notification.permission === 'granted';
};

// Set notification enabled status
export const setNotificationsEnabled = (enabled) => {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
};

// Check if notification details/previews are enabled
export const isNotificationPreviewEnabled = () => {
  return localStorage.getItem(NOTIFICATION_PREVIEW_KEY) !== 'false';
};

// Set notification preview enabled status (persisted locally and synced with RTDB)
export const setNotificationPreviewEnabled = async (enabled, uid = null) => {
  localStorage.setItem(NOTIFICATION_PREVIEW_KEY, enabled ? 'true' : 'false');
  if (uid) {
    try {
      const { updateUser } = await import('./db');
      await updateUser(uid, { notificationPreviewEnabled: enabled });
    } catch (e) {
      console.warn('[OneSignal] Failed to sync notification preview preference with database:', e.message);
    }
  }
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

// ============ ONESIGNAL MULTI-PLATFORM BRIDGE SETUPS ============

// Synchronize logged-in user session with OneSignal Native Android/iOS Wrapper
export const syncOneSignalUser = (uid, username) => {
  if (isMedianApp()) {
    try {
      window.median.onesignal.login(uid);
      window.median.onesignal.tags.set({
        "is_android": "true",
        "userId": uid,
        "username": username || "user"
      });
      console.log(`[OneSignal] Logged in successfully: uid=${uid}, username=${username}`);
    } catch (e) {
      console.warn('[OneSignal] Failed to sync user identity through Median Bridge:', e.message);
    }
    return;
  }
  ensureOneSignalWeb().then(async (OneSignal) => {
    if (!OneSignal) return;
    await OneSignal.login(uid);
    await OneSignal.User.addTags({ userId: uid, username: username || 'user', platform: 'web' });
  }).catch((error) => console.warn('[OneSignal] Web identity sync failed:', error.message));
};

// Terminate OneSignal identity session on user logout
export const logoutOneSignalUser = () => {
  if (isMedianApp()) {
    try {
      window.median.onesignal.logout();
      console.log('[OneSignal] Logged out successfully.');
    } catch (e) {
      console.warn('[OneSignal] Failed to logout through Median Bridge:', e.message);
    }
    return;
  }
  ensureOneSignalWeb().then((OneSignal) => OneSignal?.logout()).catch(() => {});
};

// Deliver through the authenticated server endpoint. The OneSignal REST key is
// intentionally never included in the browser bundle.
export const sendOneSignalNotification = async (targetUserId, title, bodyText, data = {}) => {
  // Respect the privacy settings of the receiver from their database profile
  let isPreview = true;
  try {
    const { getUser } = await import('./db');
    const receiverProfile = await getUser(targetUserId);
    if (receiverProfile && receiverProfile.notificationPreviewEnabled !== undefined) {
      isPreview = receiverProfile.notificationPreviewEnabled;
    }
  } catch (err) {
    console.warn('[OneSignal] Failed to fetch receiver privacy settings, falling back to sender default:', err.message);
    isPreview = isNotificationPreviewEnabled();
  }
  
  const maskedBody = formatBodyForPreview(bodyText, isPreview);

  try {
    const { auth } = await import('./firebase');
    if (!auth.currentUser) return false;
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetUserId,
        title,
        bodyText: maskedBody,
        data,
      }),
    });
    const result = await response.json();
    return response.ok && result.ok === true;
  } catch (error) {
    console.error('[OneSignal] Notification send error:', error);
    return false;
  }
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
    const OneSignal = await ensureOneSignalWeb();
    if (OneSignal) {
      await OneSignal.Notifications.requestPermission();
      if (Notification.permission !== 'granted') return null;
      await OneSignal.User.PushSubscription.optIn();
      setNotificationsEnabled(true);
      return { provider: 'onesignal' };
    }

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
    const OneSignal = await ensureOneSignalWeb().catch(() => null);
    if (OneSignal) await OneSignal.User.PushSubscription.optOut();
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
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  
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
      if ('Notification' in window) {
        new Notification(title, options);
        return true;
      }
      return false;
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
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview 
    ? (post.type === 'project' ? `New project: ${post.title || 'Check it out!'}` : `New discussion: ${post.content || 'Join the conversation!'}`)
    : "A new post has been published.";

  await showNotification('New on Discuss', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `post-${post.id}`,
    data: { url: `/post/${post.id}`, type: 'post' }
  });
  
  markNotificationSent('post', post.id);
};

// Notify chat message (4-hour cooldown)
export const notifyChatMessage = async (chatId, senderName) => {
  if (!isNotificationsEnabled()) return;
  if (!canSendChatNotification(chatId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? (senderName ? `${senderName} sent you a message` : 'You have a new message')
    : "You received a new direct message.";

  await showNotification('New message in your chat', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `chat-${chatId}`,
    data: { url: `/chat/${chatId}`, type: 'chat' }
  });
  
  updateChatCooldown(chatId);
};

// Notify friend request
export const notifyFriendRequest = async (fromUserId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('friend_request', fromUserId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? `${fromUsername || 'Someone'} wants to connect with you`
    : "You have received a new friend request.";

  await showNotification('New Friend Request', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `friend-request-${fromUserId}`,
    data: { url: '/profile', type: 'friend' }
  });
  
  markNotificationSent('friend_request', fromUserId);
};

// Notify friend accepted
export const notifyFriendAccepted = async (fromUserId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('friend_accepted', fromUserId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? `${fromUsername || 'Someone'} accepted your friend request`
    : "Your friend request has been approved.";

  await showNotification('Friend Request Accepted', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `friend-accepted-${fromUserId}`,
    data: { url: `/user/${fromUserId}`, type: 'friend' }
  });
  
  markNotificationSent('friend_accepted', fromUserId);
};

// Notify new group message
export const notifyGroupMessage = async (groupId, groupName, senderName) => {
  if (!isNotificationsEnabled()) return;
  if (!canSendChatNotification(groupId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? (senderName ? `${senderName} sent a message` : 'You have a new group message')
    : `New message posted in ${groupName || 'group'}.`;

  await showNotification(`New message in ${groupName || 'group'}`, {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `group-chat-${groupId}`,
    data: { url: `/group/${groupId}`, type: 'group_chat' }
  });
  
  updateChatCooldown(groupId);
};

// Notify group join request
export const notifyGroupJoinRequest = async (groupId, groupName, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent(`group_request_${groupId}`, fromUsername)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? `${fromUsername || 'Someone'} requested to join ${groupName || 'your group'}`
    : "A new user has requested to join your group.";

  await showNotification('New Group Join Request', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `group-request-${groupId}-${fromUsername}`,
    data: { url: `/join-requests`, type: 'group_request' }
  });
  
  markNotificationSent(`group_request_${groupId}`, fromUsername);
};

// Notify group request accepted
export const notifyGroupRequestAccepted = async (groupId, groupName) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('group_accepted', groupId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? `Your request to join ${groupName || 'the group'} was accepted`
    : "Your group join request has been approved.";

  await showNotification('Group Request Accepted', {
    body: formatBodyForPreview(bodyText, isPreview),
    tag: `group-accepted-${groupId}`,
    data: { url: `/group/${groupId}`, type: 'group' }
  });
  
  markNotificationSent('group_accepted', groupId);
};

// Notify new comment
export const notifyNewComment = async (postId, fromUsername) => {
  if (!isNotificationsEnabled()) return;
  if (wasNotificationSent('comment', postId)) return;
  
  const isPreview = isNotificationPreviewEnabled();
  const bodyText = isPreview
    ? `${fromUsername || 'Someone'} commented on your post`
    : "A new comment was posted on your discussion.";

  await showNotification('New Comment', {
    body: formatBodyForPreview(bodyText, isPreview),
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
  isNotificationPreviewEnabled,
  setNotificationPreviewEnabled,
  requestPermission,
  registerPushSubscription,
  unsubscribePush,
  showNotification,
  notifyNewPost,
  notifyChatMessage,
  notifyFriendRequest,
  notifyFriendAccepted,
  syncOneSignalUser,
  logoutOneSignalUser,
  sendOneSignalNotification
};
