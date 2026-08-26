'use strict';

const { handleWebhook } = require('../server/audioCallBackend');

const readRawBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  req.on('error', reject);
});

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }
  try {
    const rawBody = await readRawBody(req);
    const result = await handleWebhook(rawBody, req.headers.authorization || '');
    return res.status(200).send(result);
  } catch (error) {
    console.error('[LiveKit webhook]', error.message);
    return res.status(401).send('Invalid webhook');
  }
};

module.exports.config = { api: { bodyParser: false } };
