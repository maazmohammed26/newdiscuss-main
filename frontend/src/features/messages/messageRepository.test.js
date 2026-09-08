jest.mock('@/data/outbox/outboxOperations', () => ({
  createOperationId: jest.fn(() => 'operation-1'),
  OUTBOX_STATUS: { FAILED: 'failed' },
}));
jest.mock('@/data/outbox/outboxStore', () => ({
  outboxStore: { getForEntity: jest.fn() },
}));
jest.mock('@/data/sync/outboxSync', () => ({
  enqueueOutboxOperation: jest.fn().mockResolvedValue(undefined),
  flushOutbox: jest.fn().mockResolvedValue(undefined),
  retryOutboxOperation: jest.fn(),
}));
jest.mock('@/lib/chatsDb', () => ({
  getOrCreateChat: jest.fn().mockResolvedValue({ id: 'chat-1' }),
  sendMessage: jest.fn().mockResolvedValue({ id: 'operation-1' }),
  sendReplyMessage: jest.fn(),
}));
jest.mock('@/lib/groupsDb', () => ({ sendGroupMessage: jest.fn() }));
jest.mock('@/lib/cacheManager', () => ({
  mergeCachedMessages: jest.fn().mockResolvedValue(undefined),
  mergeCachedGroupMessages: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/notificationService', () => ({
  emitNotificationEvent: jest.fn().mockResolvedValue({ ok: true }),
}));

import { enqueueOutboxOperation, flushOutbox } from '@/data/sync/outboxSync';
import { createOperationId } from '@/data/outbox/outboxOperations';
import { mergeCachedMessages } from '@/lib/cacheManager';
import { sendMessage } from '@/lib/chatsDb';
import { emitNotificationEvent } from '@/lib/notificationService';
import { queueDirectMessage, syncDirectMessage } from './messageRepository';

describe('messageRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createOperationId.mockReturnValue('operation-1');
    enqueueOutboxOperation.mockResolvedValue(undefined);
    flushOutbox.mockResolvedValue(undefined);
    mergeCachedMessages.mockResolvedValue(undefined);
    sendMessage.mockResolvedValue({ id: 'operation-1' });
    emitNotificationEvent.mockResolvedValue({ ok: true });
  });

  it('persists an optimistic direct message with a stable operation id', async () => {
    const message = await queueDirectMessage({
      userId: 'sender', chatId: 'chat-1', recipientId: 'recipient', senderName: 'Sender', text: 'Hello',
    });

    expect(message).toEqual(expect.objectContaining({ id: 'operation-1', status: 'sending', text: 'Hello' }));
    expect(enqueueOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'operation-1', operationType: 'direct.message.send', entityId: 'chat-1',
    }));
    expect(mergeCachedMessages).toHaveBeenCalledWith('sender', 'chat-1', [expect.objectContaining({ id: 'operation-1' })]);
  });

  it('uses the operation id for idempotent remote writes and notification events', async () => {
    const operation = {
      operationId: 'operation-1', userId: 'sender', entityId: 'chat-1',
      payload: { message: { recipientId: 'recipient', senderName: 'Sender', text: 'Hello', media: [], timestamp: '2026-01-01T00:00:00.000Z' } },
    };

    await syncDirectMessage(operation);

    expect(sendMessage).toHaveBeenCalledWith(
      'chat-1', 'sender', 'Hello', [], undefined, undefined,
      { messageId: 'operation-1', timestamp: '2026-01-01T00:00:00.000Z' }
    );
    expect(emitNotificationEvent).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'operation-1' }));
  });

  it('keeps the operation retryable when notification persistence fails', async () => {
    emitNotificationEvent.mockResolvedValueOnce({ ok: false, code: 'request-failed' });
    await expect(syncDirectMessage({
      operationId: 'operation-1', userId: 'sender', entityId: 'chat-1',
      payload: { message: { recipientId: 'recipient', text: 'Hello', media: [], timestamp: '2026-01-01T00:00:00.000Z' } },
    })).rejects.toThrow('Notification event failed');
  });
});
