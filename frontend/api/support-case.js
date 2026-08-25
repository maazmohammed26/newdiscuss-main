const crypto = require('crypto');

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MIN_MESSAGE_LENGTH = 12;
const MAX_MESSAGE_LENGTH = 1200;
const ALLOWED_TYPES = new Set(['bug', 'feature', 'suggestion', 'account', 'other']);

// Best-effort, instance-local abuse protection. No support messages or user
// details are persisted by this endpoint.
const requestWindows = new Map();

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

const isRateLimited = (ip) => {
  const now = Date.now();
  const current = requestWindows.get(ip);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestWindows.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  requestWindows.set(ip, current);
  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

const createCaseNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `DSC-${date}-${random}`;
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
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Request origin is not allowed.' });
      }
    } catch {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  if (body.website) return res.status(200).json({ ok: true });
  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'Too many support requests. Please try again later.' });
  }

  const userId = String(body.userId || '').trim().slice(0, 160);
  const username = String(body.username || '').trim().replace(/^@/, '').slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const message = String(body.message || '').trim();
  const type = ALLOWED_TYPES.has(body.type) ? body.type : 'other';

  if (!userId || !username) {
    return res.status(400).json({ error: 'Sign in again before sending in-app support.' });
  }
  if (message.length < MIN_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Add at least ${MIN_MESSAGE_LENGTH} characters so we can understand the request.` });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Keep the request within ${MAX_MESSAGE_LENGTH} characters.` });
  }

  const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(503).json({ error: 'In-app support is temporarily unavailable.' });
  }

  const caseNumber = createCaseNumber();
  const submittedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const telegramMessage = [
    '<b>NEW DISCUSS SUPPORT CASE</b>',
    '',
    `<b>Case:</b> <code>${escapeHtml(caseNumber)}</code>`,
    `<b>Type:</b> ${escapeHtml(type.toUpperCase())}`,
    `<b>Username:</b> @${escapeHtml(username)}`,
    `<b>User ID:</b> <code>${escapeHtml(userId)}</code>`,
    `<b>Email:</b> ${escapeHtml(email || 'Not available')}`,
    `<b>Submitted:</b> ${escapeHtml(submittedAt)} IST`,
    '',
    '<b>Message</b>',
    escapeHtml(message),
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const result = await telegramResponse.json();
    if (!telegramResponse.ok || !result.ok) {
      return res.status(502).json({ error: 'Could not send your support request. Please try again.' });
    }

    return res.status(200).json({ ok: true, caseNumber });
  } catch {
    return res.status(502).json({ error: 'Could not send your support request. Please try again.' });
  } finally {
    clearTimeout(timeout);
  }
};
