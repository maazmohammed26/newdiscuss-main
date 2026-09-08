'use strict';

const { ApiError, verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');

const windows = new Map();
const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const limited = (uid) => {
  const now = Date.now();
  const current = windows.get(uid);
  if (!current || now - current.startedAt > 15 * 60_000) {
    windows.set(uid, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 6;
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ ok: false, code: 'forbidden-origin' });
  try {
    const user = await verifyUser(req.headers.authorization);
    if (limited(user.uid)) return res.status(429).json({ ok: false, code: 'rate-limited' });
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type = String(input.type || '');
    const email = String(input.email || '').trim().toLowerCase();
    if (!['welcome', 'verification_otp'].includes(type) || !user.email || email !== String(user.email).toLowerCase()) {
      return res.status(403).json({ ok: false, code: 'recipient-mismatch' });
    }
    const key = process.env.BREVO_API_KEY;
    if (!key) return res.status(503).json({ ok: false, code: 'email-not-configured' });
    const username = escapeHtml(String(input.username || 'Discuss Member').slice(0, 80));
    const otp = String(input.otp || '');
    if (type === 'verification_otp' && !/^\d{6}$/.test(otp)) return res.status(400).json({ ok: false, code: 'invalid-otp' });
    const subject = type === 'welcome' ? 'Welcome to Discuss — your developer network is ready' : `${otp} is your Discuss verification code`;
    const main = type === 'welcome'
      ? `<h1>Welcome to Discuss, ${username}.</h1><p>Your developer profile is ready. Share what you are building and connect with the developer community.</p><p><a href="https://discussit.in/feed">Open your Discuss feed</a></p>`
      : `<h1>Verify your email address</h1><p>Hello ${username}, use this code within five minutes:</p><p style="font-size:36px;font-weight:800;letter-spacing:8px">${otp}</p><p>Never share this code. Discuss support will not ask for it.</p>`;
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: '<Discuss/>', email: 'support@discussit.in' },
        to: [{ email, name: String(input.username || 'Discuss Member').slice(0, 80) }],
        subject,
        htmlContent: `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827"><main style="max-width:560px;margin:32px auto;background:white;padding:40px;border-radius:20px;border:1px solid #e5e7eb"><div style="font-size:28px;font-weight:800;margin-bottom:28px">&lt;Discuss/&gt;</div>${main}<hr style="border:0;border-top:1px solid #e5e7eb;margin-top:32px"><small>If you did not request this, contact support@discussit.in.</small></main></body></html>`,
      }),
    });
    if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[Email API] Delivery failed:', error.message);
    return res.status(status).json({ ok: false, code: error.code || 'email-delivery-failed' });
  }
};
