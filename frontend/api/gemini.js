// Vercel Serverless Function — secure backend proxy for Google Gemini API calls.
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

const sanitizeBody = (body) => {
  const input = body && typeof body === 'object' ? body : {};
  const contents = (Array.isArray(input.contents) ? input.contents : []).slice(-20).map((message) => ({
    role: message?.role === 'model' ? 'model' : 'user',
    parts: (Array.isArray(message?.parts) ? message.parts : []).slice(0, 8).map((part) => ({
      text: String(part?.text || '').slice(0, 12_000),
    })),
  }));
  const systemText = String(input.systemInstruction?.parts?.[0]?.text || '').slice(0, 8_000);
  return {
    contents,
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    generationConfig: {
      temperature: Math.max(0, Math.min(Number(input.generationConfig?.temperature) || 0, 1)),
      maxOutputTokens: Math.max(1, Math.min(Number(input.generationConfig?.maxOutputTokens) || 1024, 2048)),
      ...(input.generationConfig?.responseMimeType === 'application/json' ? { responseMimeType: 'application/json' } : {}),
    },
  };
};

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin, req.headers.host)) return res.status(403).json({ error: 'Forbidden origin.' });
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-model');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use the provided Gemini Key directly on the server
  // Fallback to environment variables if provided key is missing
  try {
    const user = await verifyUser(req.headers.authorization);
    if (isRateLimited(user.uid)) return res.status(429).json({ error: 'Rate limit reached.' });
  } catch (error) {
    return res.status(error instanceof ApiError ? error.status : 401).json({ error: 'Authentication required.' });
  }
  let apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing Gemini API key.' });
  }

  const requestedModel = String(req.headers['x-gemini-model'] || 'gemini-2.5-flash');
  const allowedModels = new Set(['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash']);
  const model = allowedModels.has(requestedModel) ? requestedModel : 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sanitizeBody(req.body)),
    });

    let data;
    const contentType = geminiRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await geminiRes.json().catch(() => ({}));
    } else {
      const text = await geminiRes.text().catch(() => '');
      data = { error: text || `HTTP Error ${geminiRes.status}` };
    }

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: 'Rate limit reached. Google Gemini API quota exceeded.', details: data });
      }
      return res.status(geminiRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[Gemini Proxy Error]', err.message);
    return res.status(502).json({ 
      error: 'Failed to reach Gemini API.',
      details: err.message
    });
  }
};
