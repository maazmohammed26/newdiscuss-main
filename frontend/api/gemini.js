// Vercel Serverless Function — secure backend proxy for Google Gemini API calls.
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-gemini-model');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use the provided Gemini Key directly on the server
  // Fallback to environment variables if provided key is missing
  let apiKey = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing Gemini API key.' });
  }

  const model = req.headers['x-gemini-model'] || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
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
}
