'use strict';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { ApiError, verifyUser } = require('../server/audioCallBackend');
const { isAllowedOrigin } = require('../server/requestSecurity');

const ALLOWED_PROJECTS = new Set(['secondary', 'chats', 'groups', 'stories', 'devradar']);

const getServiceAccounts = () => {
  const raw = process.env.AUX_FIREBASE_SERVICE_ACCOUNTS_JSON;
  if (!raw) throw new ApiError(503, 'aux-auth-not-configured', 'Auxiliary authentication is not configured.');
  try {
    const accounts = JSON.parse(raw);
    return accounts && typeof accounts === 'object' ? accounts : {};
  } catch (_) {
    throw new ApiError(503, 'aux-auth-invalid-config', 'Auxiliary authentication configuration is invalid.');
  }
};

const getAuxiliaryAdminApp = (project, account) => {
  const name = `discuss-aux-${project}`;
  return getApps().find((app) => app.name === name) || initializeApp({ credential: cert(account) }, name);
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'method-not-allowed' });
  if (!isAllowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ ok: false, code: 'forbidden-origin' });
  try {
    const user = await verifyUser(req.headers.authorization);
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const project = String(input.project || '');
    if (!ALLOWED_PROJECTS.has(project)) return res.status(400).json({ ok: false, code: 'invalid-project' });
    const serviceAccount = getServiceAccounts()[project];
    if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
      return res.status(503).json({ ok: false, code: 'project-auth-not-configured' });
    }
    const app = getAuxiliaryAdminApp(project, serviceAccount);
    const token = await getAuth(app).createCustomToken(user.uid, { sourceProject: 'discuss-primary' });
    return res.status(200).json({ ok: true, token, project, uid: user.uid });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (status >= 500) console.error('[AUTH] Auxiliary token mint failed:', error.code || error.message);
    return res.status(status).json({ ok: false, code: error.code || 'aux-auth-failed' });
  }
};
