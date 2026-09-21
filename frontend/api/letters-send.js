'use strict';

const { verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');
const { sendLetterServer } = require('../server/lettersBackend');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
    return res.status(403).json({ ok: false, code: 'forbidden-origin' });
  }

  try {
    const actorToken = await verifyUser(req.headers.authorization);
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const result = await sendLetterServer({
      actorUid: actorToken.uid,
      recipientUid: input.recipientUid,
      body: input.body,
      originCityId: input.originCityId,
      originCityLabel: input.originCityLabel,
      rememberCity: Boolean(input.rememberCity),
      clientMutationId: input.clientMutationId || req.headers['x-discuss-client-mutation-id'],
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[LettersApi] Send failed:', error);
    return res.status(status).json({
      ok: false,
      code: error.code || 'letter-send-failed',
      error: error.message || 'Failed to send letter.',
    });
  }
};
