'use strict';

const { ApiError, handleAction } = require('../server/audioCallBackend');

const requestWindows = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 40;

const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
  .split(',')[0].trim();

const isRateLimited = (key) => {
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.', code: 'method-not-allowed' });
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Request origin is not allowed.', code: 'origin-not-allowed' });
      }
    } catch (_) {
      return res.status(403).json({ error: 'Request origin is not allowed.', code: 'origin-not-allowed' });
    }
  }
  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many call requests. Please wait and try again.', code: 'rate-limit' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const data = await handleAction(req.headers.authorization, body);
    return res.status(200).json(data);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[AudioCall API]', error);
    return res.status(status).json({
      error: status >= 500 ? 'Audio calling is temporarily unavailable.' : error.message,
      code: error.code || 'internal-error',
    });
  }
};
