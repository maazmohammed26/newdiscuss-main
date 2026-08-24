const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

// Best-effort, instance-local protection. It stores only a temporary request
// count by IP; submitted email addresses are never persisted.
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

  // Quietly accept bot-filled honeypot submissions without sending anything.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid Google Play email.' });
  }

  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.REACT_APP_TELEGRAM_ADMIN_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.REACT_APP_TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(503).json({ error: 'Access requests are temporarily unavailable.' });
  }

  const requestedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const message = [
    '<b>ANDROID EARLY ACCESS REQUEST</b>',
    '',
    `<b>Email:</b> <code>${escapeHtml(email)}</code>`,
    `<b>Requested:</b> ${escapeHtml(requestedAt)} IST`,
    '<b>Source:</b> Discuss landing page',
    '',
    'Please add this email to the Google Play closed-testing access list.',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const result = await telegramResponse.json();
    if (!telegramResponse.ok || !result.ok) {
      return res.status(502).json({ error: 'Could not send the request. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Could not send the request. Please try again.' });
  } finally {
    clearTimeout(timeout);
  }
};
