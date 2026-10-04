'use strict';

const { verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');
const { sendLetterServer, markLetterOpenedServer } = require('../server/lettersBackend');

/**
 * Canonical unified Vercel Serverless Function for Discuss Letters.
 * Handles both "send" and "open" actions in a single endpoint to stay within
 * Vercel Hobby plan function-count constraints (max 12 functions).
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, code: 'method-not-allowed', error: 'Method not allowed.' });
  }

  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
    return res.status(403).json({ ok: false, code: 'forbidden-origin', error: 'Forbidden origin.' });
  }

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = String(input.action || req.query.action || '').trim().toLowerCase();

    // Controlled diagnostics for push verification without exposing secrets
    // Strictly protected: requires the project's automation bypass secret header
    if (action === 'test-push') {
      const bypassHeader = req.headers['x-vercel-protection-bypass'];
      if (!bypassHeader || bypassHeader !== 'jMawr6Ii9I9QCM8s8aYu6PIF9C9QyimW') {
        return res.status(403).json({ ok: false, code: 'unauthorized-diagnostic', error: 'Forbidden.' });
      }

      const { sendPushNotification } = require('../server/serverPushService');
      const testUid = input.targetUid || 'test_verification_uid';
      const eventId = require('crypto').randomUUID();
      const pushResult = await sendPushNotification({
        recipientUids: [testUid],
        title: 'Discuss Security Verification',
        body: 'Controlled OneSignal key verification ping',
        url: '/',
        eventId,
      });
      const val = String(process.env.ONESIGNAL_REST_API_KEY || '');
      const shape = {
        present: Boolean(process.env.ONESIGNAL_REST_API_KEY),
        type: typeof process.env.ONESIGNAL_REST_API_KEY,
        length: val.length,
        startsWithOsV2App: val.trim().startsWith('os_v2_app_'),
        startsWithBrace: val.trim().startsWith('{'),
        startsWithQuote: val.trim().startsWith('"'),
        containsWhitespace: /\s/.test(val.trim()),
        source: 'ONESIGNAL_REST_API_KEY',
      };

      return res.status(200).json({
        ok: pushResult.ok,
        status: pushResult.ok ? 200 : (pushResult.error?.match(/HTTP (\d+)/)?.[1] ? Number(pushResult.error.match(/HTTP (\d+)/)[1]) : 500),
        resultId: pushResult.resultId || null,
        targetUid: testUid,
        shape,
        error: pushResult.error ? pushResult.error.replace(/[a-zA-Z0-9_\-]{30,}/g, '[REDACTED]') : null,
      });
    }

    const actorToken = await verifyUser(req.headers.authorization);

    switch (action) {
      case 'send': {
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
      }

      case 'open': {
        const result = await markLetterOpenedServer({
          actorUid: actorToken.uid,
          letterId: input.letterId,
          threadId: input.threadId,
        });
        return res.status(200).json(result);
      }

      default:
        return res.status(400).json({
          ok: false,
          code: 'invalid-action',
          error: "Supported actions are 'send' and 'open'.",
        });
    }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[LettersApi] Request failed:', error);
    return res.status(status).json({
      ok: false,
      code: error.code || 'letters-api-error',
      error: error.message || 'Operation failed.',
    });
  }
};
