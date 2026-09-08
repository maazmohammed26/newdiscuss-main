import { outboxStore } from '@/data/outbox/outboxStore';
import { createOutboxProcessor } from '@/data/outbox/outboxProcessor';
import { createOperationId } from '@/data/outbox/outboxOperations';

const ownerId = `tab:${createOperationId()}`;
const processor = createOutboxProcessor({ store: outboxStore, ownerId });
let broadcastChannel = null;

const withCrossTabLock = async (callback) => {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(
      'discuss-outbox-sync-v1',
      { mode: 'exclusive', ifAvailable: true },
      (lock) => lock ? callback() : []
    );
  }
  return callback();
};

export const registerOutboxHandler = (operationType, handler) => (
  processor.register(operationType, handler)
);

export const flushOutbox = async (userId) => {
  if (!userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return [];
  const results = await withCrossTabLock(() => processor.flush(userId));
  if (typeof window !== 'undefined' && results?.length) {
    window.dispatchEvent(new CustomEvent('discuss:outbox-results', { detail: { userId, results } }));
  }
  return results;
};

export const enqueueOutboxOperation = async (input) => {
  const operation = await outboxStore.enqueue(input);
  broadcastChannel?.postMessage({ type: 'queued', userId: operation.userId });
  return operation;
};

export const retryOutboxOperation = async (operationId, userId) => {
  const operation = await outboxStore.retry(operationId, userId);
  if (operation) await flushOutbox(userId);
  return operation;
};

export const startOutboxSync = (getUserId) => {
  if (typeof window === 'undefined') return () => {};
  let stopped = false;
  const flushCurrentUser = () => {
    const userId = getUserId?.();
    if (!stopped && userId) flushOutbox(userId).catch((error) => {
      console.warn('[SYNC] Outbox flush failed:', error?.message);
    });
  };

  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('discuss-outbox-v1');
    broadcastChannel.addEventListener('message', (event) => {
      if (event.data?.type === 'queued' && event.data.userId === getUserId?.()) {
        flushCurrentUser();
      }
    });
  }

  window.addEventListener('online', flushCurrentUser);
  const intervalId = window.setInterval(flushCurrentUser, 15_000);
  outboxStore.pruneCompleted().catch((error) => {
    console.warn('[SYNC] Outbox cleanup failed:', error?.message);
  });
  flushCurrentUser();

  return () => {
    stopped = true;
    window.removeEventListener('online', flushCurrentUser);
    window.clearInterval(intervalId);
    broadcastChannel?.close();
    broadcastChannel = null;
  };
};

export { outboxStore };
