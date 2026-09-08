import { AppError, ERROR_CODES } from '@/data/errors/AppError';
import { createOutboxProcessor } from './outboxProcessor';

const operation = (overrides = {}) => ({
  operationId: 'op-1',
  operationType: 'test.write',
  attempts: 0,
  ...overrides,
});

const createStore = (operations = []) => ({
  claimDue: jest.fn().mockResolvedValue(operations),
  markCompleted: jest.fn().mockResolvedValue(undefined),
  markAttempt: jest.fn().mockResolvedValue(undefined),
});

test('processor completes a registered operation', async () => {
  const store = createStore([operation()]);
  const processor = createOutboxProcessor({
    store,
    ownerId: 'tab',
    now: () => 100,
  });
  const handler = jest.fn().mockResolvedValue({ ok: true });
  processor.register('test.write', handler);

  await expect(processor.flush('user')).resolves.toEqual([
    { operationId: 'op-1', status: 'completed', result: { ok: true } },
  ]);
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ operationId: 'op-1' }));
  expect(store.markCompleted).toHaveBeenCalledWith('op-1', 'tab', { ok: true }, 100);
});

test('processor schedules retryable errors with exponential backoff', async () => {
  const store = createStore([operation({ attempts: 1 })]);
  const processor = createOutboxProcessor({
    store,
    ownerId: 'tab',
    now: () => 10_000,
  });
  processor.register('test.write', async () => {
    throw new AppError(ERROR_CODES.NETWORK, 'offline', { retryable: true });
  });

  const [result] = await processor.flush('user');
  expect(result.status).toBe('pending');
  expect(store.markAttempt).toHaveBeenCalledWith('op-1', 'tab', expect.objectContaining({
    attempts: 2,
    retryAt: 12_000,
    terminal: false,
  }));
});

test('processor stops retrying non-retryable and exhausted operations', async () => {
  const store = createStore([
    operation({ operationId: 'invalid' }),
    operation({ operationId: 'exhausted', attempts: 4 }),
  ]);
  const processor = createOutboxProcessor({
    store,
    ownerId: 'tab',
    now: () => 100,
    maxAttempts: 5,
  });
  processor.register('test.write', async (item) => {
    if (item.operationId === 'invalid') {
      throw new AppError(ERROR_CODES.VALIDATION, 'invalid');
    }
    throw new AppError(ERROR_CODES.NETWORK, 'offline', { retryable: true });
  });

  const results = await processor.flush('user');
  expect(results.map((item) => item.status)).toEqual(['failed', 'failed']);
  expect(store.markAttempt).toHaveBeenNthCalledWith(1, 'invalid', 'tab', expect.objectContaining({
    terminal: true,
  }));
  expect(store.markAttempt).toHaveBeenNthCalledWith(2, 'exhausted', 'tab', expect.objectContaining({
    attempts: 5,
    terminal: true,
  }));
});

test('processor fails an operation with no registered handler', async () => {
  const store = createStore([operation({ operationType: 'missing' })]);
  const processor = createOutboxProcessor({ store, ownerId: 'tab', now: () => 100 });

  const [result] = await processor.flush('user');
  expect(result.status).toBe('failed');
  expect(store.markAttempt).toHaveBeenCalledWith('op-1', 'tab', expect.objectContaining({
    terminal: true,
  }));
});

test('processor preserves claimed operation order', async () => {
  const order = [];
  const store = createStore([
    operation({ operationId: 'first' }),
    operation({ operationId: 'second' }),
  ]);
  const processor = createOutboxProcessor({ store, ownerId: 'tab' });
  processor.register('test.write', async (item) => {
    order.push(item.operationId);
  });

  await processor.flush('user');
  expect(order).toEqual(['first', 'second']);
});
