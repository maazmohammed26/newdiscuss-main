import { getLocalDatabase } from '@/data/db/localDatabase';
import {
  OUTBOX_STATUS,
  createOutboxOperation,
  serializeOutboxError,
} from './outboxOperations';

const byCreatedAt = (a, b) => (
  (a.createdAt || 0) - (b.createdAt || 0)
  || String(a.operationId).localeCompare(String(b.operationId))
);

export const outboxStore = {
  async enqueue(input) {
    const operation = createOutboxOperation(input);
    const db = await getLocalDatabase();
    await db.put('outbox', operation);
    return operation;
  },

  async get(operationId) {
    const db = await getLocalDatabase();
    return db.get('outbox', operationId);
  },

  async claimDue({
    userId,
    ownerId,
    now = Date.now(),
    limit = 10,
    leaseMs = 30_000,
  }) {
    if (!userId || !ownerId) return [];
    const db = await getLocalDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    const rows = await store.getAll();
    const due = rows
      .filter((row) => row.userId === userId)
      .filter((row) => (
        (row.status === OUTBOX_STATUS.PENDING && (row.nextAttemptAt || 0) <= now)
        || (row.status === OUTBOX_STATUS.SYNCING && (row.leaseExpiresAt || 0) <= now)
      ))
      .sort(byCreatedAt)
      .slice(0, Math.max(1, Math.min(limit, 25)));

    for (const operation of due) {
      await store.put({
        ...operation,
        status: OUTBOX_STATUS.SYNCING,
        leaseOwner: ownerId,
        leaseExpiresAt: now + leaseMs,
        updatedAt: now,
      });
    }
    await transaction.done;

    return due.map((operation) => ({
      ...operation,
      status: OUTBOX_STATUS.SYNCING,
      leaseOwner: ownerId,
      leaseExpiresAt: now + leaseMs,
      updatedAt: now,
    }));
  },

  async markCompleted(operationId, ownerId, result = null, now = Date.now()) {
    const db = await getLocalDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    const operation = await store.get(operationId);
    if (!operation || operation.leaseOwner !== ownerId) {
      await transaction.done;
      return null;
    }
    const completed = {
      ...operation,
      status: OUTBOX_STATUS.COMPLETED,
      result,
      completedAt: now,
      updatedAt: now,
      leaseOwner: null,
      leaseExpiresAt: 0,
      lastError: null,
    };
    await store.put(completed);
    await transaction.done;
    return completed;
  },

  async markAttempt(operationId, ownerId, {
    attempts,
    error,
    retryAt,
    terminal,
    now = Date.now(),
  }) {
    const db = await getLocalDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    const operation = await store.get(operationId);
    if (!operation || operation.leaseOwner !== ownerId) {
      await transaction.done;
      return null;
    }
    const updated = {
      ...operation,
      status: terminal ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.PENDING,
      attempts,
      nextAttemptAt: terminal ? 0 : retryAt,
      updatedAt: now,
      leaseOwner: null,
      leaseExpiresAt: 0,
      lastError: serializeOutboxError(error),
    };
    await store.put(updated);
    await transaction.done;
    return updated;
  },

  async retry(operationId, userId, now = Date.now()) {
    const db = await getLocalDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    const operation = await store.get(operationId);
    if (!operation || operation.userId !== userId || operation.status !== OUTBOX_STATUS.FAILED) {
      await transaction.done;
      return null;
    }
    const pending = {
      ...operation,
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
      nextAttemptAt: now,
      updatedAt: now,
      leaseOwner: null,
      leaseExpiresAt: 0,
      lastError: null,
    };
    await store.put(pending);
    await transaction.done;
    return pending;
  },

  async pruneCompleted({ olderThan, keep = 100 } = {}) {
    const db = await getLocalDatabase();
    const transaction = db.transaction('outbox', 'readwrite');
    const store = transaction.objectStore('outbox');
    const completed = (await store.getAll())
      .filter((row) => row.status === OUTBOX_STATUS.COMPLETED)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const cutoff = olderThan ?? (Date.now() - 24 * 60 * 60 * 1000);
    const removable = completed.filter((row, index) => index >= keep || (row.completedAt || 0) < cutoff);
    for (const row of removable) await store.delete(row.operationId);
    await transaction.done;
    return removable.length;
  },
};
