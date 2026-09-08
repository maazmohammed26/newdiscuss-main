import { setVote } from '@/lib/db';
import {
  enqueueOutboxOperation,
  flushOutbox,
  outboxStore,
} from '@/data/sync/outboxSync';
import {
  POST_SET_VOTE,
  queuePostVote,
  syncPostVote,
} from './voteRepository';

jest.mock('@/lib/db', () => ({
  setVote: jest.fn(),
}));

jest.mock('@/data/sync/outboxSync', () => ({
  enqueueOutboxOperation: jest.fn(),
  flushOutbox: jest.fn(),
  outboxStore: { get: jest.fn() },
}));

const setOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
});

test('queuePostVote persists and eagerly flushes an online final-state mutation', async () => {
  const queued = { operationId: 'operation', userId: 'user' };
  const completed = { ...queued, status: 'completed', result: { upvote_count: 1 } };
  enqueueOutboxOperation.mockResolvedValue(queued);
  flushOutbox.mockResolvedValue([]);
  outboxStore.get.mockResolvedValue(completed);

  await expect(queuePostVote({ postId: 'post', userId: 'user', vote: 'up' }))
    .resolves.toBe(completed);
  expect(enqueueOutboxOperation).toHaveBeenCalledWith(expect.objectContaining({
    entityId: 'post',
    operationType: POST_SET_VOTE,
    payload: { postId: 'post', userId: 'user', vote: 'up' },
  }));
  expect(flushOutbox).toHaveBeenCalledWith('user');
});

test('queuePostVote remains pending offline', async () => {
  setOnline(false);
  const queued = { operationId: 'operation', userId: 'user', status: 'pending' };
  enqueueOutboxOperation.mockResolvedValue(queued);
  outboxStore.get.mockResolvedValue(queued);

  await expect(queuePostVote({ postId: 'post', userId: 'user', vote: null }))
    .resolves.toBe(queued);
  expect(flushOutbox).not.toHaveBeenCalled();
});

test('queuePostVote keeps a durable optimistic operation when eager flush throws', async () => {
  const queued = { operationId: 'operation', userId: 'user', status: 'pending' };
  enqueueOutboxOperation.mockResolvedValue(queued);
  flushOutbox.mockRejectedValue(new Error('lock interrupted'));
  outboxStore.get.mockResolvedValue(queued);

  await expect(queuePostVote({ postId: 'post', userId: 'user', vote: 'up' }))
    .resolves.toBe(queued);
});

test('queuePostVote surfaces an immediately terminal operation', async () => {
  const queued = { operationId: 'operation', userId: 'user', status: 'pending' };
  enqueueOutboxOperation.mockResolvedValue(queued);
  flushOutbox.mockResolvedValue([]);
  outboxStore.get.mockResolvedValue({
    ...queued,
    status: 'failed',
    lastError: { code: 'PERMISSION', message: 'Denied' },
  });

  await expect(queuePostVote({ postId: 'post', userId: 'user', vote: 'up' }))
    .rejects.toMatchObject({ code: 'PERMISSION', message: 'Denied' });
});

test('queuePostVote falls back to an online write if IndexedDB is unavailable', async () => {
  enqueueOutboxOperation.mockRejectedValue(new Error('IndexedDB unavailable'));
  setVote.mockResolvedValue({ upvote_count: 2 });

  await expect(queuePostVote({ postId: 'post', userId: 'user', vote: 'up' }))
    .resolves.toEqual({ status: 'completed', result: { upvote_count: 2 } });
  expect(setVote).toHaveBeenCalledWith('post', 'up', 'user');
});

test('syncPostVote applies the idempotent final vote with the operation id', async () => {
  setVote.mockResolvedValue({ upvote_count: 1 });
  const operation = {
    operationId: 'operation',
    userId: 'user',
    entityId: 'post',
    payload: { postId: 'post', userId: 'user', vote: 'up' },
  };

  await syncPostVote(operation);
  expect(setVote).toHaveBeenCalledWith('post', 'up', 'user', { eventId: 'operation' });
});

test('syncPostVote rejects identity mismatches', () => {
  expect(() => syncPostVote({
    userId: 'other',
    entityId: 'post',
    payload: { postId: 'post', userId: 'user', vote: 'up' },
  })).toThrow('identity mismatch');
});
