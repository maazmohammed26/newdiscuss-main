import { createOperationId, OUTBOX_STATUS } from '@/data/outbox/outboxOperations';
import { outboxStore } from '@/data/outbox/outboxStore';
import {
  enqueueOutboxOperation,
  flushOutbox,
  retryOutboxOperation,
} from '@/data/sync/outboxSync';
import { getOrCreateChat, sendMessage, sendReplyMessage } from '@/lib/chatsDb';
import { sendGroupMessage } from '@/lib/groupsDb';
import { mergeCachedMessages, mergeCachedGroupMessages } from '@/lib/cacheManager';
import { emitNotificationEvent } from '@/lib/notificationService';

export const DIRECT_MESSAGE_SEND = 'direct.message.send';
export const GROUP_MESSAGE_SEND = 'group.message.send';

const statusForOperation = (operation) => (
  operation.status === OUTBOX_STATUS.FAILED ? 'failed' : 'sending'
);

const messageFromOperation = (operation) => ({
  id: operation.operationId,
  clientOperationId: operation.operationId,
  ...operation.payload.message,
  status: statusForOperation(operation),
  syncError: operation.lastError || null,
});

const queue = async ({ userId, entityType, entityId, operationType, message, cache }) => {
  const operationId = createOperationId();
  const optimistic = {
    id: operationId,
    clientOperationId: operationId,
    ...message,
    status: 'sending',
  };
  await enqueueOutboxOperation({
    operationId,
    userId,
    entityType,
    entityId,
    operationType,
    payload: { message },
  });
  await cache([optimistic]);
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    flushOutbox(userId).catch(() => {});
  }
  return optimistic;
};

export const queueDirectMessage = ({ userId, chatId, recipientId, senderName, text = '', media = [], location = null, replyTo = null, forwardedInfo = null }) => {
  const timestamp = new Date().toISOString();
  return queue({
    userId,
    entityType: 'directConversation',
    entityId: chatId,
    operationType: DIRECT_MESSAGE_SEND,
    message: { sender: userId, recipientId, senderName, text, media, location, replyTo, forwardedInfo, timestamp, read: false },
    cache: (items) => mergeCachedMessages(userId, chatId, items),
  });
};

export const queueGroupMessage = ({ userId, groupId, groupName, recipientIds = [], senderName, text = '', media = [], location = null, replyTo = null, forwardedInfo = null }) => {
  const timestamp = new Date().toISOString();
  return queue({
    userId,
    entityType: 'groupConversation',
    entityId: groupId,
    operationType: GROUP_MESSAGE_SEND,
    message: { sender: userId, groupName, recipientIds, senderName, text, media, location, replyTo, forwardedInfo, timestamp, type: 'message' },
    cache: (items) => mergeCachedGroupMessages(userId, groupId, items),
  });
};

export const syncDirectMessage = async (operation) => {
  const message = operation.payload.message;
  await getOrCreateChat(operation.userId, message.recipientId);
  const options = { messageId: operation.operationId, timestamp: message.timestamp };
  const result = message.replyTo
    ? await sendReplyMessage(operation.entityId, operation.userId, message.text, message.replyTo, message.media, options)
    : await sendMessage(operation.entityId, operation.userId, message.text, message.media, message.location, message.forwardedInfo, options);
  const notification = await emitNotificationEvent({
    type: 'direct_message',
    recipientId: message.recipientId,
    entityId: operation.entityId,
    url: `/chat/${encodeURIComponent(operation.userId)}`,
    eventId: operation.operationId,
    data: { text: message.text, hasMedia: Boolean(message.media?.length || message.location), senderName: message.senderName },
  });
  if (!notification.ok) throw new Error(`Notification event failed: ${notification.code}`);
  return result;
};

export const syncGroupMessage = async (operation) => {
  const message = operation.payload.message;
  const result = await sendGroupMessage(
    operation.entityId,
    operation.userId,
    message.text,
    message.replyTo,
    message.media,
    message.location,
    message.forwardedInfo,
    { messageId: operation.operationId, timestamp: message.timestamp }
  );
  if (message.recipientIds?.length) {
    const notification = await emitNotificationEvent({
      type: 'group_message',
      recipientIds: message.recipientIds,
      entityId: operation.entityId,
      url: `/group/${encodeURIComponent(operation.entityId)}`,
      eventId: operation.operationId,
      data: { text: message.text, hasMedia: Boolean(message.media?.length || message.location), groupName: message.groupName, senderName: message.senderName },
    });
    if (!notification.ok) throw new Error(`Notification event failed: ${notification.code}`);
  }
  return result;
};

export const getQueuedMessages = async (userId, entityType, entityId) => {
  const operations = await outboxStore.getForEntity(userId, entityType, entityId);
  return operations
    .filter((operation) => [DIRECT_MESSAGE_SEND, GROUP_MESSAGE_SEND].includes(operation.operationType))
    .map(messageFromOperation);
};

export const retryMessage = (operationId, userId) => retryOutboxOperation(operationId, userId);

export const subscribeToMessageSync = (userId, callback) => {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => {
    if (event.detail?.userId === userId) callback(event.detail.results || []);
  };
  window.addEventListener('discuss:outbox-results', listener);
  return () => window.removeEventListener('discuss:outbox-results', listener);
};
