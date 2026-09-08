import { getAuthenticatedIdToken } from './authenticatedRequest';

const newEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const postNotification = async (token, payload) => {
  const response = await fetch('/api/send-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Discuss-Event-Id': payload.eventId,
    },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  return { response, result };
};

const isRetryableStatus = (status) => status === 408 || status === 425 || status === 429 || status >= 500;

/**
 * Small, eager-loaded transport for remote alerts. Keeping this separate from
 * the permission/SDK module prevents a stale lazy chunk from silently dropping
 * a notification after a production deployment.
 */
export const sendRemoteNotification = async (
  targetUserId,
  title,
  bodyText,
  data = {},
  options = {}
) => {
  const eventId = options.eventId || newEventId();
  const payload = { targetUserId, title, bodyText, data, eventId };

  try {
    let token = await getAuthenticatedIdToken();
    let { response, result } = await postNotification(token, payload);

    // Mobile WebViews occasionally resume with an expired cached token.
    if (response.status === 401) {
      token = await getAuthenticatedIdToken({ forceRefresh: true });
      ({ response, result } = await postNotification(token, payload));
    }

    // One immediate retry covers serverless cold-start/provider transients.
    // The same eventId is preserved so OneSignal can deduplicate the request.
    if (!response.ok && isRetryableStatus(response.status)) {
      ({ response, result } = await postNotification(token, payload));
    }

    if (!response.ok || result.ok !== true) {
      console.warn('[OneSignal] Remote delivery rejected:', {
        eventId,
        status: response.status,
        code: result.code || 'delivery-failed',
      });
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[OneSignal] Remote delivery could not start:', {
      eventId,
      code: error?.code || 'request-failed',
      message: error?.message,
    });
    return false;
  }
};

export default sendRemoteNotification;
