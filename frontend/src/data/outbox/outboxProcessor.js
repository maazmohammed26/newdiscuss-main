import { toAppError } from '@/data/errors/AppError';
import { computeRetryDelay } from './outboxOperations';

export const createOutboxProcessor = ({
  store,
  ownerId,
  handlers = new Map(),
  now = () => Date.now(),
  maxAttempts = 5,
  batchSize = 10,
} = {}) => {
  if (!store?.claimDue || !store?.markCompleted || !store?.markAttempt) {
    throw new TypeError('A complete outbox store is required.');
  }
  if (!ownerId) throw new TypeError('An outbox owner ID is required.');

  const register = (operationType, handler) => {
    if (!operationType || typeof handler !== 'function') {
      throw new TypeError('A named outbox handler function is required.');
    }
    handlers.set(operationType, handler);
    return () => handlers.delete(operationType);
  };

  const processOperation = async (operation) => {
    const handler = handlers.get(operation.operationType);
    if (!handler) {
      const error = new Error(`No sync handler is registered for ${operation.operationType}.`);
      await store.markAttempt(operation.operationId, ownerId, {
        attempts: operation.attempts + 1,
        error,
        retryAt: 0,
        terminal: true,
        now: now(),
      });
      return { operationId: operation.operationId, status: 'failed', error };
    }

    try {
      const result = await handler(operation);
      await store.markCompleted(operation.operationId, ownerId, result ?? null, now());
      return { operationId: operation.operationId, status: 'completed', result };
    } catch (rawError) {
      const error = toAppError(rawError, {
        operationId: operation.operationId,
        operationType: operation.operationType,
      });
      const attempts = operation.attempts + 1;
      const terminal = !error.retryable || attempts >= maxAttempts;
      const retryAt = terminal ? 0 : now() + computeRetryDelay(attempts);
      await store.markAttempt(operation.operationId, ownerId, {
        attempts,
        error,
        retryAt,
        terminal,
        now: now(),
      });
      return {
        operationId: operation.operationId,
        status: terminal ? 'failed' : 'pending',
        error,
      };
    }
  };

  const flush = async (userId) => {
    if (!userId) return [];
    const operations = await store.claimDue({
      userId,
      ownerId,
      now: now(),
      limit: batchSize,
    });
    const results = [];
    // Keep user mutations ordered. This is especially important for multiple
    // queued final-state writes against the same entity.
    for (const operation of operations) {
      results.push(await processOperation(operation));
    }
    return results;
  };

  return { register, flush, processOperation };
};
