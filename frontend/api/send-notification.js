'use strict';

const { ApiError, verifyUser } = require('../server/audioCallBackend');

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
  return current.count > 30;
};

const cleanData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  Object.entries(value).slice(0, 20).forEach(([key, item]) => {
    const safeKey = String(key).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    if (!safeKey) return;
    if (['string', 'number', 'boolean'].includes(typeof item)) result[safeKey] = String(item).slice(0, 500);
  });
  return result;
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
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: 'Request origin is not allowed.' });
    } catch (_) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
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
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${apiKey}` },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [targetUserId] },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: bodyText },
        data: { ...cleanData(body.data), senderId: sender.uid },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: 'Notification delivery failed.' });
    return res.status(200).json({ ok: Boolean(result.id), id: result.id || null });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[Notification API]', error);
    return res.status(status).json({ error: status >= 500 ? 'Notifications are temporarily unavailable.' : error.message });
  }
};
