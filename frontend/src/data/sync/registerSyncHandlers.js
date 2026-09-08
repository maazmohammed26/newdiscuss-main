import { registerOutboxHandler } from './outboxSync';
import { POST_SET_VOTE, syncPostVote } from '@/features/posts/voteRepository';

let initialized = false;

export const initializeSyncHandlers = () => {
  if (initialized) return;
  registerOutboxHandler(POST_SET_VOTE, syncPostVote);
  initialized = true;
};
