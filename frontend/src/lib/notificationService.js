import { getAuthenticatedIdToken } from './authenticatedRequest';

const makeEventId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const emitNotificationEvent = async ({
  type,
  recipientId,
  recipientIds,
  entityId = '',
  url = '/',
  data = {},
  eventId,
}) => {
  const recipients = [...new Set([...(recipientIds || []), recipientId].filter(Boolean))];
  if (!type || recipients.length === 0) return { ok: false, code: 'no-recipient' };
  const stableEventId = eventId || makeEventId();
  try {
    const body = JSON.stringify({ type, recipientIds: recipients, entityId, url, data, eventId: stableEventId });
    const request = async (forceRefresh = false) => {
      const token = await getAuthenticatedIdToken(forceRefresh ? { forceRefresh: true } : undefined);
      return fetch('/api/notification-event', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Discuss-Event-Id': stableEventId,
        },
        body,
      });
    };

    let response = await request();
    if (response.status === 401) response = await request(true);
    else if (response.status >= 500) response = await request();
    const result = await response.json().catch(() => ({}));
    const outcome = response.ok
      ? { ...result, eventId: stableEventId }
      : { ok: false, code: result.code || `http-${response.status}`, eventId: stableEventId };
    try { sessionStorage.setItem('discuss_last_notification_send', JSON.stringify({ ...outcome, at: new Date().toISOString(), type })); } catch (_) {}
    return outcome;
  } catch (error) {
    console.warn('[Notifications] Event delivery deferred/failed:', error?.message);
    const outcome = { ok: false, code: 'request-failed', eventId: stableEventId };
    try { sessionStorage.setItem('discuss_last_notification_send', JSON.stringify({ ...outcome, at: new Date().toISOString(), type })); } catch (_) {}
    return outcome;
  }
};

export default emitNotificationEvent;
