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
      throw new Error(`OneSignal HTTP ${response.status}: ${errDetail}`);
    }
    return result;
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

  // Attempt 1: Modern alias-based targeting by external_id (Firebase UID)
  try {
    const aliasPayload = {
      ...basePayload,
      include_aliases: { external_id: validRecipients },
    };
    const result = await postJson('https://api.onesignal.com/notifications?c=push', aliasPayload, {
      Authorization: `Key ${apiKey}`,
    });

    return { ok: true, delivered: true, resultId: result.id, recipientsCount: result.recipients || validRecipients.length };
  } catch (aliasError) {
    console.warn('[PushService] Primary alias push failed, evaluating fallback:', aliasError.message);

    // Fallback: check if any recipient has direct subscription IDs in their profile
    const directSubscriptionIds = [];
    const legacyPlayerIds = [];

    for (const uid of validRecipients) {
      const profile = recipientProfiles[uid];
      if (profile?.oneSignalSubscriptionId) {
        directSubscriptionIds.push(String(profile.oneSignalSubscriptionId));
      }
      const legacyId = profile?.oneSignalUserId || profile?.playerId;
      if (legacyId) {
        legacyPlayerIds.push(String(legacyId));
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
        console.warn('[PushService] Direct subscription push failed:', subError.message);
      }
    }

    if (legacyPlayerIds.length > 0) {
      try {
        const legacyPayload = {
          ...basePayload,
          include_player_ids: legacyPlayerIds,
        };
        const result = await postJson('https://onesignal.com/api/v1/notifications', legacyPayload, {
          Authorization: `Basic ${apiKey}`,
        });
        return { ok: true, delivered: true, fallback: 'player_id', resultId: result.id };
      } catch (legacyError) {
        console.warn('[PushService] Legacy player ID push failed:', legacyError.message);
      }
    }

    return { ok: false, error: aliasError.message };
  }
};

module.exports = {
  sendPushNotification,
  ONESIGNAL_APP_ID,
  APP_ORIGIN,
};
