// Admin Global Message Service - Database 2
// Handles admin broadcast messages with push notifications

import {
  secondaryDatabase,
  ref,
  get,
  onValue,
  off
} from './firebaseSecondary';
import { showNotification, isNotificationsEnabled } from './pushNotificationService';

// Local storage keys
const ADMIN_MSG_SEEN_KEY = 'discuss_admin_msg_seen';
const ADMIN_MSG_LAST_ACTIVE_KEY = 'discuss_admin_msg_last_active';

/**
 * Get last seen timestamp
 */
const getLastSeenTime = () => {
  return parseInt(localStorage.getItem(ADMIN_MSG_SEEN_KEY) || '0', 10);
};

/**
 * Mark current message as seen
 */
const markAsSeen = (timestamp) => {
  localStorage.setItem(ADMIN_MSG_SEEN_KEY, timestamp.toString());
};

/**
 * Check if notification was already sent for this activation
 */
const wasNotificationSent = (activationTime) => {
  const lastActive = localStorage.getItem(ADMIN_MSG_LAST_ACTIVE_KEY) || '0';
  return lastActive === activationTime.toString();
};

/**
 * Mark notification as sent for this activation
 */
const markNotificationSent = (activationTime) => {
  localStorage.setItem(ADMIN_MSG_LAST_ACTIVE_KEY, activationTime.toString());
};

/**
 * Subscribe to admin global message
 * @param {Function} callback - (message, isNew) => void
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAdminMessage = (callback) => {
  const msgRef = ref(secondaryDatabase, 'adminMessage');
  
  const handleMessage = async (snapshot) => {
    if (!snapshot.exists()) {
      callback(null, false);
      return;
    }
    
    const data = snapshot.val();
    
    // If not active, return null and clear last active
    if (!data.isActive) {
      localStorage.removeItem(ADMIN_MSG_LAST_ACTIVE_KEY);
      callback(null, false);
      return;
    }
    
    const activationTime = data.createdAt || Date.now();
    const lastSeenTime = getLastSeenTime();
    const isNew = activationTime > lastSeenTime;
    
    // Trigger push notification if this activation hasn't been notified yet
    if (!wasNotificationSent(activationTime) && isNotificationsEnabled()) {
      await showNotification('Message from Discuss Admin', {
        body: data.message?.substring(0, 100) || 'New announcement',
        tag: 'admin-message-' + activationTime,
        data: { url: '/feed', type: 'admin' }
      });
      markNotificationSent(activationTime);
    }
    
    callback({
      message: data.message,
      createdAt: data.createdAt,
      isActive: data.isActive
    }, isNew);
  };
  
  onValue(msgRef, handleMessage);
  return () => off(msgRef);
};

/**
 * Mark admin message as seen (for badge removal)
 */
export const markAdminMessageSeen = () => {
  const msgRef = ref(secondaryDatabase, 'adminMessage');
  get(msgRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.createdAt && data.isActive) {
        markAsSeen(data.createdAt);
      }
    }
  });
};

/**
 * Check if there's an unseen admin message
 */
export const hasUnseenAdminMessage = async () => {
  try {
    const msgRef = ref(secondaryDatabase, 'adminMessage');
    const snapshot = await get(msgRef);
    if (!snapshot.exists()) return false;
    
    const data = snapshot.val();
    if (!data.isActive) return false;
    
    const activationTime = data.createdAt || 0;
    const lastSeenTime = getLastSeenTime();
    return activationTime > lastSeenTime;
  } catch {
    return false;
  }
};

