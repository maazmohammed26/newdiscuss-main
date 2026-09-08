import { registerOutboxHandler } from './outboxSync';
import { POST_SET_VOTE, syncPostVote } from '@/features/posts/voteRepository';
import {
  DIRECT_MESSAGE_SEND,
  GROUP_MESSAGE_SEND,
  syncDirectMessage,
  syncGroupMessage,
} from '@/features/messages/messageRepository';

let initialized = false;

export const initializeSyncHandlers = () => {
  if (initialized) return;
  registerOutboxHandler(POST_SET_VOTE, syncPostVote);
  registerOutboxHandler(DIRECT_MESSAGE_SEND, syncDirectMessage);
  registerOutboxHandler(GROUP_MESSAGE_SEND, syncGroupMessage);
  initialized = true;
};
