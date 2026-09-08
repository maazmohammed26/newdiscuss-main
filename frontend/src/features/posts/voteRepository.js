import { setVote } from '@/lib/db';
import {
  enqueueOutboxOperation,
  flushOutbox,
  outboxStore,
} from '@/data/sync/outboxSync';

export const POST_SET_VOTE = 'post.setVote';

export const syncPostVote = (operation) => {
  const { postId, vote, userId } = operation.payload;
  if (operation.userId !== userId || operation.entityId !== postId) {
    throw new Error('Vote operation identity mismatch.');
  }
  return setVote(postId, vote, userId, { eventId: operation.operationId });
};

export const queuePostVote = async ({ postId, userId, vote }) => {
  let operation;
  try {
    operation = await enqueueOutboxOperation({
      userId,
      entityType: 'post',
      entityId: postId,
      operationType: POST_SET_VOTE,
      payload: { postId, userId, vote },
    });
  } catch (error) {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      const result = await setVote(postId, vote, userId);
      return { status: 'completed', result };
    }
    throw error;
  }

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      await flushOutbox(userId);
    } catch (error) {
      console.warn('[SYNC] Eager vote flush failed; operation remains queued:', error?.message);
    }
  }
  let storedOperation = operation;
  try {
    storedOperation = (await outboxStore.get(operation.operationId)) || operation;
  } catch (error) {
    console.warn('[SYNC] Could not read queued vote status:', error?.message);
  }
  if (storedOperation.status === 'failed') {
    const error = new Error(storedOperation.lastError?.message || 'Vote synchronization failed.');
    error.code = storedOperation.lastError?.code;
    throw error;
  }
  return storedOperation;
};
