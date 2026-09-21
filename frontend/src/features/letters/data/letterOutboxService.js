/**
 * letterOutboxService.js
 * Outbox processor integration for offline Discuss Letters.
 * Allows letters written offline to queue locally and automatically flush upon reconnect.
 */

import { getLocalDatabase } from '@/data/db/localDatabase';
import { createOutboxOperation } from '@/data/outbox/outboxOperations';
import { sendLetterCommand } from './letterRepository';

export const LETTER_SEND_OPERATION = 'letter_send';

/**
 * Queues an offline letter send into the durable outbox.
 */
export const queueLetterSend = async ({
  senderUid,
  recipientUid,
  body,
  originCityId,
  originCityLabel,
  destinationCityId,
  destinationCityLabel,
  rememberCity,
  clientMutationId,
}) => {
  const db = await getLocalDatabase();
  const operation = createOutboxOperation({
    userId: senderUid,
    entityType: 'letter',
    entityId: clientMutationId,
    operationType: LETTER_SEND_OPERATION,
    payload: {
      recipientUid,
      body,
      originCityId,
      originCityLabel,
      destinationCityId,
      destinationCityLabel,
      rememberCity,
      clientMutationId,
    },
  });

  await db.put('outbox', operation);
  return operation;
};

/**
 * Handler executed by outbox processor when connectivity is active.
 */
export const syncLetterSend = async (operation) => {
  const { payload, userId } = operation;
  if (!payload || !userId) return { success: true };

  await sendLetterCommand({
    senderUid: userId,
    recipientUid: payload.recipientUid,
    body: payload.body,
    originCityId: payload.originCityId,
    originCityLabel: payload.originCityLabel,
    destinationCityId: payload.destinationCityId,
    destinationCityLabel: payload.destinationCityLabel,
    rememberCity: payload.rememberCity,
  });

  return { success: true };
};
