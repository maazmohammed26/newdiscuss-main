'use strict';

/**
 * Vercel Serverless Function for Discuss Memories.
 * Handles authenticated memory creation, cascading deletion, sharing,
 * hearts, and authorized downloads.
 */

const { verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');
const {
  createMemoryServer,
  deleteMemoryServer,
  shareMemoryServer,
  getMemorySharesServer,
  getPublicMemoriesServer,
  updateMemoryVisibilityServer,
  getSharedReceivedServer,
  getSharedSentServer,
  toggleHeartServer,
  getAuthorizedDownloadServer,
} = require('../server/memoriesBackend');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin, req.headers.host)) {
    return res.status(403).json({ ok: false, code: 'forbidden-origin', error: 'Forbidden origin.' });
  }

  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = String(input.action || req.query.action || '').trim().toLowerCase();

  // Public action does not strictly require auth, but enriches hearts if token is provided
  if (action === 'public') {
    try {
      let actorUid = null;
      const authHeader = req.headers.authorization || '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const actorToken = await verifyUser(authHeader);
          actorUid = actorToken.uid;
        } catch (_) {}
      }

      const limit = Number(req.query.limit || input.limit || 30);
      const result = await getPublicMemoriesServer({ limit, actorUid });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message || 'Failed to fetch public memories.' });
    }
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      code: 'unauthenticated',
      error: 'Please sign in to access Discuss Memories.',
    });
  }

  let actorUid;
  try {
    const actorToken = await verifyUser(authHeader);
    actorUid = actorToken.uid;
  } catch (authErr) {
    return res.status(401).json({
      ok: false,
      code: 'unauthenticated',
      error: 'Your session has expired or is invalid. Please sign in again.',
    });
  }

  try {
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required.' });
        const result = await createMemoryServer({
          actorUid,
          memoryDate: input.memoryDate,
          caption: input.caption,
          location: input.location,
          visibility: input.visibility,
          cloudinaryPublicId: input.cloudinaryPublicId,
          cloudinaryUrl: input.cloudinaryUrl,
          width: input.width,
          height: input.height,
          format: input.format,
        });
        return res.status(200).json(result);
      }

      case 'delete': {
        if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required.' });
        const result = await deleteMemoryServer({
          actorUid,
          memoryId: input.memoryId,
          yearMonth: input.yearMonth,
        });
        return res.status(200).json(result);
      }

      case 'shares':
      case 'get_shares': {
        const memoryId = input.memoryId || req.query.memoryId;
        const result = await getMemorySharesServer({
          actorUid,
          memoryId,
        });
        return res.status(200).json(result);
      }

      case 'share':
      case 'update_shares': {
        if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required.' });
        const result = await shareMemoryServer({
          actorUid,
          memoryId: input.memoryId,
          yearMonth: input.yearMonth,
          recipientUids: input.recipientUids,
        });
        return res.status(200).json(result);
      }

      case 'visibility':
      case 'update_visibility': {
        if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required.' });
        const result = await updateMemoryVisibilityServer({
          actorUid,
          memoryId: input.memoryId,
          yearMonth: input.yearMonth,
          visibility: input.visibility,
        });
        return res.status(200).json(result);
      }

      case 'shared_received': {
        const result = await getSharedReceivedServer({ actorUid });
        return res.status(200).json(result);
      }

      case 'shared_sent': {
        const result = await getSharedSentServer({ actorUid });
        return res.status(200).json(result);
      }

      case 'heart': {
        if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required.' });
        const result = await toggleHeartServer({
          actorUid,
          memoryId: input.memoryId,
        });
        return res.status(200).json(result);
      }

      case 'download': {
        const memoryId = input.memoryId || req.query.memoryId;
        const yearMonth = input.yearMonth || req.query.yearMonth;
        const result = await getAuthorizedDownloadServer({
          actorUid,
          memoryId,
          yearMonth,
        });
        return res.status(200).json(result);
      }

      default:
        return res.status(400).json({
          ok: false,
          code: 'invalid-action',
          error: "Supported actions are 'public', 'shares', 'share', 'visibility', 'create', 'delete', 'heart', 'download', 'shared_received', and 'shared_sent'.",
        });
    }
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('[MemoriesApi] Request failed:', error);
    return res.status(status).json({
      ok: false,
      code: error.code || 'memories-api-error',
      error: error.message || 'Operation failed.',
    });
  }
};
