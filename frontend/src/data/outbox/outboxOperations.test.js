import { AppError, ERROR_CODES } from '@/data/errors/AppError';
import {
  OUTBOX_STATUS,
  computeRetryDelay,
  createOutboxOperation,
  serializeOutboxError,
} from './outboxOperations';

test('createOutboxOperation creates a durable pending record', () => {
  const operation = createOutboxOperation({
    userId: 'user',
    entityType: 'post',
    entityId: 'post',
    operationType: 'post.setVote',
    payload: { vote: 'up' },
  }, {
    now: () => 100,
    idFactory: () => 'operation',
  });

  expect(operation).toMatchObject({
    operationId: 'operation',
    status: OUTBOX_STATUS.PENDING,
    attempts: 0,
    createdAt: 100,
    nextAttemptAt: 100,
  });
});

test('createOutboxOperation rejects incomplete records', () => {
  expect(() => createOutboxOperation({ userId: 'user' })).toThrow(AppError);
});

test('retry delay is exponential and bounded', () => {
  expect(computeRetryDelay(1)).toBe(1000);
  expect(computeRetryDelay(4)).toBe(8000);
  expect(computeRetryDelay(20)).toBe(60_000);
});

test('serialized errors contain only bounded diagnostics', () => {
  const result = serializeOutboxError(new AppError(ERROR_CODES.NETWORK, 'x'.repeat(500)));
  expect(result.code).toBe(ERROR_CODES.NETWORK);
  expect(result.message).toHaveLength(240);
});
