/** Shared DM + group rules for “deleted for everyone” display and list previews. */

export const DELETED_MESSAGE_PREVIEW = 'Deleted message';
export const LEGACY_DELETED_TEXT = 'This message was deleted';

export function isDeletedForEveryone(msg) {
  if (!msg || typeof msg !== 'object') return false;
  if (msg.deleted === true) return true;
  const t = msg.text;
  return t === LEGACY_DELETED_TEXT || t === DELETED_MESSAGE_PREVIEW;
}

/** Safe body for bubbles / list (never show original content for everyone-deleted). */
export function displayMessageText(msg) {
  if (isDeletedForEveryone(msg)) return DELETED_MESSAGE_PREVIEW;
  return msg?.text ?? '';
}

/** Chat list / group row: lastMessage string from RTDB userChats / userGroups. */
export function isDeletedListPreview(lastMessage) {
  return (
    lastMessage === LEGACY_DELETED_TEXT || lastMessage === DELETED_MESSAGE_PREVIEW
  );
}

export function previewFromLastMessageString(lastMessage, isBlocked, deletedGroup = false) {
  if (isBlocked) return 'Chat unavailable';
  if (deletedGroup) return 'Group was deleted';
  if (lastMessage === LEGACY_DELETED_TEXT || lastMessage === DELETED_MESSAGE_PREVIEW) {
    return DELETED_MESSAGE_PREVIEW;
  }
  return lastMessage || 'No messages yet';
}

export function replyPreviewText(replyTo, messageIndexById = {}) {
  if (!replyTo) return '';
  const target = messageIndexById[replyTo.id];
  if (target && isDeletedForEveryone(target)) return DELETED_MESSAGE_PREVIEW;
  if (isDeletedForEveryone({ text: replyTo.text, deleted: replyTo.deleted })) {
    return DELETED_MESSAGE_PREVIEW;
  }
  return replyTo.text || '';
}

/** Strip sensitive text when persisting to local caches. */
export function normalizeMessageForCache(msg) {
  if (!msg) return msg;
  if (!isDeletedForEveryone(msg)) return msg;
  return {
    ...msg,
    text: DELETED_MESSAGE_PREVIEW,
    replyTo: msg.replyTo
      ? { ...msg.replyTo, text: isDeletedForEveryone({ text: msg.replyTo.text }) ? DELETED_MESSAGE_PREVIEW : msg.replyTo.text }
      : msg.replyTo,
  };
}

export function normalizeMessagesForCache(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(normalizeMessageForCache);
}
