'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { ApiError, verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');

const ALLOWED_PROJECTS = new Set(['secondary', 'chats', 'groups', 'stories', 'devradar']);

const getServiceAccounts = () => {
  const raw = process.env.AUX_FIREBASE_SERVICE_ACCOUNTS_JSON;
  if (!raw || !raw.trim()) {
    throw new ApiError(503, 'AUX_CONFIG_MISSING', 'Auxiliary authentication is not configured.');
  }
  try {
    const accounts = JSON.parse(raw);
    if (!accounts || typeof accounts !== 'object') {
      throw new Error('Malformed object');
    }
    return accounts;
  } catch (_) {
    throw new ApiError(503, 'AUX_CONFIG_INVALID_JSON', 'Auxiliary authentication configuration JSON is invalid.');
  }
};

const getAuxiliaryAdminApp = (project, account) => {
  const name = `discuss-aux-${project}`;
  const existingApp = getApps().find((app) => app.name === name);
  if (existingApp) return existingApp;

  // Normalize newline formatting in PEM private keys (handles both literal \n and escaped \\n)
  const normalizedKey = typeof account.private_key === 'string'
    ? account.private_key.replace(/\\n/g, '\n')
    : account.private_key;

  const credentialObj = {
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: normalizedKey,
  };

  return initializeApp({ credential: cert(credentialObj) }, name);
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) {
    return res.status(403).json({ ok: false, code: 'forbidden-origin' });
  }

  let project = 'unknown';
  let targetProjectId = 'unknown';

  try {
    const user = await verifyUser(req.headers.authorization);
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    project = String(input.project || '').trim();

    if (!ALLOWED_PROJECTS.has(project)) {
      return res.status(400).json({ ok: false, code: 'AUX_TARGET_UNKNOWN' });
    }

    const serviceAccounts = getServiceAccounts();
    const serviceAccount = serviceAccounts[project];

    if (
      !serviceAccount ||
      typeof serviceAccount !== 'object' ||
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      return res.status(503).json({ ok: false, code: 'AUX_SERVICE_ACCOUNT_INVALID' });
    }

    targetProjectId = serviceAccount.project_id;
    const app = getAuxiliaryAdminApp(project, serviceAccount);
    const token = await getAuth(app).createCustomToken(user.uid, { sourceProject: 'discuss-primary' });

    return res.status(200).json({ ok: true, token, project, uid: user.uid });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const code = error instanceof ApiError ? error.code : 'AUX_TOKEN_CREATION_FAILED';

    if (status >= 500) {
      console.error('[AUTH] Auxiliary token mint failed:', {
        targetAlias: project,
        projectId: targetProjectId,
        category: code,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(status).json({ ok: false, code });
  }
};
