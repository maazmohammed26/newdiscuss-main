'use strict';

const { ApiError, verifyUser, primaryDb } = require('../server/audioCallBackend');

const ONESIGNAL_APP_ID = '280791b6-7711-4b32-8897-449efe155f2b';
const windows = new Map();

const isRateLimited = (uid) => {
  const now = Date.now();
  const current = windows.get(uid);
  if (!current || now - current.startedAt >= 60 * 1000) {
    windows.set(uid, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 60;
};

const cleanData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  Object.entries(value).slice(0, 30).forEach(([key, item]) => {
    const safeKey = String(key).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50);
    if (!safeKey) return;
    if (['string', 'number', 'boolean'].includes(typeof item)) result[safeKey] = String(item).slice(0, 500);
  });
  return result;
};

const isAllowedOrigin = (origin, host) => {
  if (!origin) return true; // Mobile wrappers, webviews, and native APK callers often have null/empty origin
  if (origin === 'null' || origin === 'file://') return true;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'capacitor:' || parsed.protocol === 'ionic:') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'discussit.in' || hostname.endsWith('.discussit.in')) return true;
    if (hostname.endsWith('.vercel.app')) return true;
    if (host && (parsed.host === host || hostname === host.split(':')[0].toLowerCase())) return true;
    return false;
  } catch (_) {
    return true; // Allow custom native scheme headers
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!isAllowedOrigin(origin, host)) {
    console.warn('[Notification API] Forbidden origin rejected:', origin, 'Host:', host);
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }

  try {
    const sender = await verifyUser(req.headers.authorization);
    if (isRateLimited(sender.uid)) return res.status(429).json({ error: 'Too many notification requests.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const targetUserId = String(body.targetUserId || '').trim();
    const title = String(body.title || '').trim().slice(0, 100);
    const bodyText = String(body.bodyText || '').trim().slice(0, 300);

    if (!/^[A-Za-z0-9_-]{8,160}$/.test(targetUserId) || !title || !bodyText) {
      return res.status(400).json({ error: 'Notification details are invalid.' });
    }

    const apiKey = process.env.ONESIGNAL_REST_API_KEY || process.env.REACT_APP_ONESIGNAL_REST_API_KEY;
    if (!apiKey) {
      console.warn('[Notification API] ONESIGNAL_REST_API_KEY is not configured in server environment.');
      return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    }

    // Query recipient's profile to retrieve device subscription and player identifiers
    let targetProfile = {};
    try {
      if (typeof primaryDb === 'function') {
        const snap = await primaryDb().ref(`users/${targetUserId}`).once('value');
        if (snap.exists()) targetProfile = snap.val() || {};
      }
    } catch (dbError) {
      console.warn('[Notification API] Target profile fetch skipped/failed:', dbError.message);
    }

    // Construct deep-link routing URLs
    const rawUrl = body.data?.url || body.data?.targetUrl || '';
    const relativeUrl = rawUrl ? (String(rawUrl).startsWith('/') ? String(rawUrl) : `/${rawUrl}`) : '/';
    const targetUrl = `https://www.discussit.in${relativeUrl}`;

    const basePayload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: bodyText },
      url: targetUrl,
      web_url: targetUrl,
      app_url: targetUrl,
      priority: 10,
      android_visibility: 1,
      android_channel_id: 'discuss_notifications',
      ios_sound: 'default',
      android_sound: 'default',
      data: {
        ...cleanData(body.data),
        url: relativeUrl,
        targetUrl,
        senderId: sender.uid,
      },
    };

    const deliver = async (audience, legacy = false) => {
      const endpoint = legacy
        ? 'https://onesignal.com/api/v1/notifications'
        : 'https://api.onesignal.com/notifications?c=push';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: legacy ? `Basic ${apiKey}` : `Key ${apiKey}`,
        },
        body: JSON.stringify({ ...basePayload, ...audience }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || (result.errors && !result.id)) {
        throw new Error(`OneSignal returned ${response.status}: ${JSON.stringify(result.errors || {})}`);
      }
      return result;
    };

    const delivered = (result) => Number(result?.recipients) > 0
      || (Boolean(result?.id) && result?.recipients === undefined);

    // Multi-strategy targeting matrix ensuring 100% device reachability
    const attempts = [
      // 1. Modern v2 API with external_id alias
      [{ include_aliases: { external_id: [targetUserId] }, target_channel: 'push' }, false],
      // 2. Legacy v1 API with include_external_user_ids
      [{ include_external_user_ids: [targetUserId] }, true],
    ];

    if (targetProfile.oneSignalSubscriptionId) {
      // 3. Direct subscription ID (modern v2)
      attempts.push([{ include_subscription_ids: [String(targetProfile.oneSignalSubscriptionId)] }, false]);
    }

    const legacyPlayerId = targetProfile.oneSignalUserId || targetProfile.oneSignalPlayerId;
    if (legacyPlayerId) {
      // 4. Direct player ID (legacy v1)
      attempts.push([{ include_player_ids: [String(legacyPlayerId)] }, true]);
    }

    // 5. User tag filter (legacy v1)
    attempts.push([[{ field: 'tag', key: 'userId', relation: '=', value: targetUserId }], true]);

    let lastResult = null;
    let lastError = null;

    for (const [audienceValue, legacy] of attempts) {
      const audience = Array.isArray(audienceValue) ? { filters: audienceValue } : audienceValue;
      try {
        const result = await deliver(audience, legacy);
        lastResult = result;
        if (delivered(result)) {
          console.log(`[Notification API] Push delivered to ${targetUserId} (id=${result.id}, legacy=${legacy})`);
          return res.status(200).json({ ok: true, id: result.id || null, recipients: result.recipients });
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Notification API] Strategy attempt failed for ${targetUserId} (legacy=${legacy}):`, err.message);
      }
    }

    if (lastResult?.id) {
      return res.status(200).json({ ok: true, id: lastResult.id, recipients: lastResult.recipients || 0 });
    }

    console.error(`[Notification API] All OneSignal delivery strategies failed for target=${targetUserId}:`, lastError?.message);
    return res.status(502).json({
      error: 'Notification delivery failed.',
      details: lastError?.message || 'No audience matched'
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[Notification API] Unexpected error:', error);
    return res.status(status).json({
      error: status >= 500 ? 'Notifications are temporarily unavailable.' : error.message
    });
  }
};
