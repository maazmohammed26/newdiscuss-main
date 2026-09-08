'use strict';

const { ApiError, verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');
const requestWindows = new Map();
const isRateLimited = (uid) => {
  const now = Date.now();
  const current = requestWindows.get(uid);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(uid, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ error: 'Forbidden origin' });
  try {
    const user = await verifyUser(req.headers.authorization);
    if (isRateLimited(user.uid)) return res.status(429).json({ error: 'Rate limit reached' });
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return res.status(503).json({ error: 'AI service is not configured' });
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = (Array.isArray(input.messages) ? input.messages : [])
      .slice(-20)
      .map((item) => ({ role: ['system', 'assistant'].includes(item.role) ? item.role : 'user', content: String(item.content || '').slice(0, 12_000) }));
    if (!messages.length) return res.status(400).json({ error: 'Messages are required' });
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'poolside/laguna-m.1:free', messages, stream: false, max_tokens: 1000, temperature: 0.2 }),
    });
    const result = await response.json().catch(() => ({}));
    return res.status(response.status).json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return res.status(status).json({ error: status >= 500 ? 'AI service unavailable' : error.message });
  }
};
