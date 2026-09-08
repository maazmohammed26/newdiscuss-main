'use strict';

const { ApiError, verifyUser, primaryDb } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');

const clean = (value, max = 300) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const cleanKey = (value, max = 160) => clean(value, max).replace(/[.#$\[\]/]/g, '_');
const postTelegram = async (text) => {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return { skipped: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ ok: false, code: 'forbidden-origin' });
  try {
    const actor = await verifyUser(req.headers.authorization);
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = clean(input.type, 30);
    const data = input.data && typeof input.data === 'object' ? input.data : {};
    if (!['signup', 'report'].includes(type)) return res.status(400).json({ ok: false, code: 'invalid-event-type' });
    if ((type === 'signup' && clean(data.userId, 160) !== actor.uid) || (type === 'report' && clean(data.reporterId, 160) !== actor.uid)) {
      return res.status(403).json({ ok: false, code: 'actor-mismatch' });
    }
    const eventId = cleanKey(input.eventId) || cleanKey(`${type}-${actor.uid}-${data.targetId || 'account'}`);
    const eventRef = primaryDb().ref(`notificationEvents/admin/${eventId}`);
    let created = false;
    await eventRef.transaction((current) => {
      if (current) return current;
      created = true;
      return { type, actorId: actor.uid, createdAt: new Date().toISOString() };
    }, undefined, false);
    if (!created) return res.status(200).json({ ok: true, duplicate: true });
    const text = type === 'signup'
      ? `NEW USER SIGNUP\nUsername: @${clean(data.username, 80)}\nUser ID: ${actor.uid}\nEmail: ${clean(data.email, 160)}`
      : `NEW COMMUNITY REPORT\nReporter: @${clean(data.reporterUsername, 80)} (${actor.uid})\nTarget: ${clean(data.targetType, 30)} ${clean(data.targetId, 160)}\nOwner: @${clean(data.targetOwnerUsername, 80)} (${clean(data.targetOwnerId, 160)})\nComment: ${clean(data.comment, 500)}`;
    try {
      const delivery = await postTelegram(text);
      await eventRef.update({ deliveredAt: new Date().toISOString(), delivery });
      return res.status(200).json({ ok: true, delivery });
    } catch (error) {
      console.warn('[Telegram Admin] Delivery failed:', error.message);
      await eventRef.update({ failedAt: new Date().toISOString(), error: clean(error.message, 160) });
      return res.status(200).json({ ok: true, providerFailure: true });
    }
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return res.status(status).json({ ok: false, code: error.code || 'admin-notification-failed' });
  }
};
