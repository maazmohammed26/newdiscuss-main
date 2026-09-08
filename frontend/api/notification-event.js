'use strict';

const { ApiError, verifyUser, primaryDb } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '280791b6-7711-4b32-8897-449efe155f2b';
const APP_ORIGIN = process.env.PUBLIC_APP_ORIGIN || 'https://www.discussit.in';
const ALLOWED_TYPES = new Set([
  'direct_message', 'group_message', 'comment', 'reply', 'like', 'pulse_like',
  'friend_request', 'friend_accepted', 'group_join_accepted', 'blink', 'report',
]);
const rateWindows = new Map();

const cleanText = (value, max = 240) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const cleanId = (value) => {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{6,160}$/.test(id) ? id : '';
};
const cleanUrl = (value) => {
  const raw = String(value || '/');
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw.slice(0, 500);
};

const isRateLimited = (uid) => {
  const now = Date.now();
  const current = rateWindows.get(uid);
  if (!current || now - current.startedAt >= 60_000) {
    rateWindows.set(uid, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 80;
};

const renderEvent = (type, actor, data) => {
  const name = cleanText(actor.username || actor.displayName || 'Someone', 80);
  const content = cleanText(data.text, 220);
  const groupName = cleanText(data.groupName || 'your group', 80);
  const mediaText = data.hasMedia ? 'Sent media' : 'Sent a message';
  const templates = {
    direct_message: [`New message from @${name}`, content || mediaText],
    group_message: [`New in ${groupName}`, `@${name}: ${content || mediaText}`],
    comment: [`@${name} commented`, content || 'Open Discuss to view the comment'],
    reply: [`@${name} replied`, content || 'Open Discuss to view the reply'],
    like: [`@${name} liked your post`, 'Open Discuss to view it'],
    pulse_like: [`@${name} liked your pulse`, 'Open Discuss to view it'],
    friend_request: ['New friend request', `@${name} wants to connect`],
    friend_accepted: ['Friend request accepted', `@${name} is now your friend`],
    group_join_accepted: ['Group request accepted', `You can now join ${groupName}`],
    blink: [`New Blink from @${name}`, 'Open Discuss to view it once'],
    report: ['Report received', 'Your report was saved for review'],
  };
  return templates[type];
};

const postJson = async (url, body, headers = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${response.status}: ${cleanText(result.description || result.error || 'provider rejected', 160)}`);
    return result;
  } finally {
    clearTimeout(timeout);
  }
};

const sendPush = async (recipients, title, body, url, eventId) => {
  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!key || recipients.length === 0) return { skipped: true };
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: recipients },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    url: `${APP_ORIGIN}${url}`,
    web_url: `${APP_ORIGIN}${url}`,
    app_url: `${APP_ORIGIN}${url}`,
    data: { url, eventId },
  };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
    payload.idempotency_key = eventId;
  }
  return postJson('https://api.onesignal.com/notifications?c=push', payload, { Authorization: `Key ${key}` });
};

const sendTelegram = async (profiles, text, url) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { skipped: true };
  const results = await Promise.allSettled(profiles
    .filter(({ profile }) => profile.telegramChatId)
    .map(({ profile }) => postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: String(profile.telegramChatId),
      text: profile.telegramPrivacy === false ? text : 'You have a new Discuss notification.',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: 'Open Discuss', url: `${APP_ORIGIN}${url}` }]] },
    })));
  return { attempted: results.length, failed: results.filter((item) => item.status === 'rejected').length };
};

const sendDiscord = async (profiles, title, body, url) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { skipped: true };
  let attempted = 0;
  let failed = 0;
  for (const { profile } of profiles) {
    if (!profile.discordUserId) continue;
    attempted += 1;
    try {
      const channel = await postJson('https://discord.com/api/v10/users/@me/channels', {
        recipient_id: String(profile.discordUserId),
      }, { Authorization: `Bot ${token}` });
      await postJson(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
        embeds: [{ title, description: profile.discordPrivacy === false ? body : 'You have a new Discuss notification.' }],
        components: [{ type: 1, components: [{ type: 2, label: 'Open Discuss', style: 5, url: `${APP_ORIGIN}${url}` }] }],
      }, { Authorization: `Bot ${token}` });
    } catch (error) {
      failed += 1;
      console.warn('[Notifications] Discord delivery failed:', error.message);
    }
  }
  return { attempted, failed };
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ ok: false, code: 'forbidden-origin' });

  try {
    const actorToken = await verifyUser(req.headers.authorization);
    if (isRateLimited(actorToken.uid)) return res.status(429).json({ ok: false, code: 'rate-limited' });
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = cleanText(input.type, 40);
    if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ ok: false, code: 'invalid-event-type' });
    const recipients = [...new Set((input.recipientIds || []).map(cleanId).filter(Boolean))]
      .filter((uid) => uid !== actorToken.uid)
      .slice(0, 100);
    if (!recipients.length) return res.status(400).json({ ok: false, code: 'invalid-recipient' });
    const eventId = cleanId(input.eventId || req.headers['x-discuss-event-id']);
    if (!eventId) return res.status(400).json({ ok: false, code: 'invalid-event-id' });
    const url = cleanUrl(input.url);
    const data = input.data && typeof input.data === 'object' && !Array.isArray(input.data) ? input.data : {};

    const database = primaryDb();
    const [actorSnap, ...recipientSnaps] = await Promise.all([
      database.ref(`users/${actorToken.uid}`).once('value'),
      ...recipients.map((uid) => database.ref(`users/${uid}`).once('value')),
    ]);
    const actor = actorSnap.val() || {};
    const [title, body] = renderEvent(type, actor, data);
    const profiles = recipients.map((uid, index) => ({ uid, profile: recipientSnaps[index].val() || {} }));
    const newRecipients = [];

    await Promise.all(profiles.map(async ({ uid }) => {
      const notificationRef = database.ref(`notifications/${uid}/${eventId}`);
      let created = false;
      await notificationRef.transaction((current) => {
        if (current) return current;
        created = true;
        return {
          id: eventId,
          type,
          actorId: actorToken.uid,
          entityId: cleanText(input.entityId, 160),
          title,
          body,
          url,
          read: false,
          createdAt: new Date().toISOString(),
        };
      }, undefined, false);
      if (created) newRecipients.push(uid);
    }));

    const eligibleProfiles = profiles.filter(({ uid }) => newRecipients.includes(uid));
    const pushRecipients = eligibleProfiles
      .filter(({ profile }) => profile.notificationsEnabled !== false && profile.pushNotificationsEnabled !== false)
      .map(({ uid }) => uid);
    const channelResults = await Promise.allSettled([
      sendPush(pushRecipients, title, body, url, eventId),
      sendTelegram(eligibleProfiles, `${title}\n\n${body}`, url),
      sendDiscord(eligibleProfiles, title, body, url),
    ]);
    await Promise.all(newRecipients.map((uid) => database.ref(`notifications/${uid}/${eventId}`).update({ deliveredAt: new Date().toISOString() })));
    const failures = channelResults.filter((item) => item.status === 'rejected');
    failures.forEach((item) => console.warn('[Notifications] Provider failed:', item.reason?.message));
    return res.status(200).json({ ok: true, eventId, recipients: newRecipients.length, providerFailures: failures.length });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[Notifications] Event failed:', error);
    return res.status(status).json({ ok: false, code: error.code || 'notification-failed', error: status >= 500 ? 'Notification service unavailable.' : error.message });
  }
};
