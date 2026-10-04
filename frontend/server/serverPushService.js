'use strict';

/**
 * serverPushService.js
 * Clean server-side OneSignal push notification dispatcher for Discuss.
 * - Targets authenticated Firebase UID derived external_id
 * - Fallback to direct subscription ID or legacy player ID if present
 * - Uses modern v2 endpoint with Key auth and idempotency
 * - Failures logged operationally without exposing secrets or private message bodies
 * - Push failure NEVER throws or cancels callers (e.g. Letters)
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '280791b6-7711-4b32-8897-449efe155f2b';
const APP_ORIGIN = process.env.PUBLIC_APP_ORIGIN || 'https://www.discussit.in';

const postJson = async (url, body, headers = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errDetail = typeof result === 'object' ? JSON.stringify(result.errors || result.error || response.statusText) : String(result);
      const error = new Error(`OneSignal HTTP ${response.status}: ${errDetail}`);
      error.status = response.status;
      error.details = result;
      throw error;
    }
    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('OneSignal request timed out (8s)');
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Dispatches a push notification to one or more recipient Firebase UIDs.
 * @param {object} options
 * @param {string[]} options.recipientUids
 * @param {string} options.title
 * @param {string} options.body
 * @param {string} options.url
 * @param {string} [options.eventId]
 * @param {object} [options.additionalData]
 * @param {object} [options.recipientProfiles] Optional map of uid -> profile for fallback IDs
 * @returns {Promise<{ ok: boolean, delivered?: boolean, error?: string }>}
 */
const sendPushNotification = async ({
  recipientUids = [],
  title,
  body,
  url = '/',
  eventId = null,
  additionalData = {},
  recipientProfiles = {},
}) => {
  // STRICT SECURITY: Only server-only secret variable. Never read REACT_APP_*
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const validRecipients = [...new Set(recipientUids.map(String).filter((u) => Boolean(u) && u.length >= 6))];

  if (!apiKey) {
    return { ok: false, error: 'ONESIGNAL_REST_API_KEY not configured on server' };
  }
  if (!validRecipients.length) {
    return { ok: false, error: 'No valid recipient UIDs provided' };
  }

  const targetUrl = url.startsWith('http') ? url : `${APP_ORIGIN}${url}`;
  const basePayload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: 'push',
    headings: { en: String(title).slice(0, 100) },
    contents: { en: String(body).slice(0, 200) },
    url: targetUrl,
    web_url: targetUrl,
    app_url: targetUrl,
    data: { url, eventId, ...additionalData },
  };

  if (eventId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
    basePayload.idempotency_key = eventId;
  }

  // Canonical Path: Firebase UID -> OneSignal External ID via current Create Notification API
  try {
    const aliasPayload = {
      ...basePayload,
      include_aliases: { external_id: validRecipients },
    };
    const result = await postJson('https://api.onesignal.com/notifications?c=push', aliasPayload, {
      Authorization: `Key ${apiKey}`,
    });

    return { ok: true, delivered: true, resultId: result.id, recipientsCount: result.recipients || validRecipients.length };
  } catch (primaryError) {
    console.warn('[PushService] Primary alias push failed:', primaryError.message);

    // CRITICAL: DO NOT call fallback after ambiguous failures (timeout or network error or 5xx server error).
    // A timeout does NOT prove OneSignal rejected the original request; re-dispatching risks duplicate push.
    const isAmbiguous = primaryError.isTimeout ||
                        primaryError.name === 'AbortError' ||
                        !primaryError.status ||
                        primaryError.status >= 500;

    if (isAmbiguous) {
      return { ok: false, error: `Ambiguous delivery failure: ${primaryError.message}`, ambiguous: true };
    }

    // Only attempt direct Subscription ID fallback if primary explicitly rejected with client error (e.g. 400 unmapped alias)
    // and verified subscription IDs are known for the intended recipients.
    const directSubscriptionIds = [];
    for (const uid of validRecipients) {
      const profile = recipientProfiles[uid];
      if (profile?.oneSignalSubscriptionId) {
        directSubscriptionIds.push(String(profile.oneSignalSubscriptionId));
      }
    }

    if (directSubscriptionIds.length > 0) {
      try {
        const subPayload = {
          ...basePayload,
          include_subscription_ids: directSubscriptionIds,
        };
        const result = await postJson('https://api.onesignal.com/notifications?c=push', subPayload, {
          Authorization: `Key ${apiKey}`,
        });
        return { ok: true, delivered: true, fallback: 'subscription_id', resultId: result.id };
      } catch (subError) {
        console.warn('[PushService] Direct subscription fallback failed:', subError.message);
      }
    }

    return { ok: false, error: primaryError.message };
  }
};

module.exports = {
  sendPushNotification,
  ONESIGNAL_APP_ID,
  APP_ORIGIN,
};
