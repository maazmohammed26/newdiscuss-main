// Vercel Serverless Function — secure backend proxy for NVIDIA API calls.
// This runs server-side on Vercel's edge, so browser CORS is completely bypassed.
// The API keys are never exposed to the client.
export default async function handler(req, res) {
  // Set CORS headers so the browser allows the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the API key from request header (sent by nvidiaApi.js)
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  try {
    const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await nvidiaRes.json();

    if (!nvidiaRes.ok) {
      if (nvidiaRes.status === 429) {
        return res.status(429).json({ error: 'Rate limit reached. Our servers are busy, please try again shortly.' });
      }
      return res.status(nvidiaRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[NVIDIA Proxy Error]', err.message);
    return res.status(502).json({ error: 'Failed to reach NVIDIA API. Please try again.' });
  }
}
