import { AppError, ERROR_CODES } from '@/data/errors/AppError';

export const OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending',
  SYNCING: 'syncing',
  FAILED: 'failed',
  COMPLETED: 'completed',
});

const fallbackId = () => (
  `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const createOperationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackId();
};

export const createOutboxOperation = (input, options = {}) => {
  const now = options.now?.() ?? Date.now();
  const operationId = input?.operationId || options.idFactory?.() || createOperationId();
  const required = ['userId', 'entityType', 'entityId', 'operationType'];
  const missing = required.find((field) => !String(input?.[field] || '').trim());

  if (missing) {
    throw new AppError(ERROR_CODES.VALIDATION, `Outbox operation is missing ${missing}.`, {
      context: { missing },
    });
  }

  return {
    operationId: String(operationId),
    userId: String(input.userId),
    entityType: String(input.entityType),
    entityId: String(input.entityId),
    operationType: String(input.operationType),
    payload: input.payload ?? {},
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    nextAttemptAt: input.nextAttemptAt ?? now,
    attempts: Number(input.attempts) || 0,
    status: OUTBOX_STATUS.PENDING,
    lastError: null,
    leaseOwner: null,
    leaseExpiresAt: 0,
  };
};

export const computeRetryDelay = (attempt, {
  baseMs = 1000,
  maxMs = 60_000,
} = {}) => Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));

export const serializeOutboxError = (error) => ({
  code: String(error?.code || ERROR_CODES.UNKNOWN).slice(0, 60),
  message: String(error?.message || 'Sync failed').slice(0, 240),
});
