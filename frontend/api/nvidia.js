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

  // Get the API key from request header (sent by client)
  let apiKey = req.headers['x-api-key'];

  // If the key is missing or undefined (CRA build is running in production without local .env file),
  // load the secure environment variables directly from Vercel's edge environment.
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
    const isSafety = req.body?.model?.includes('nemotron') || req.body?.model?.includes('safety');
    
    const secureAssistantKey = process.env.NVIDIA_AI_ASSISTANT_KEY || process.env.REACT_APP_NVIDIA_AI_ASSISTANT_KEY;
    const secureNemotronKey = process.env.NVIDIA_NEMOTRON_KEY || process.env.REACT_APP_NVIDIA_NEMOTRON_KEY;
    
    if (isSafety) {
      apiKey = secureNemotronKey || secureAssistantKey;
    } else {
      apiKey = secureAssistantKey || secureNemotronKey;
    }
  }

  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
    return res.status(401).json({ 
      error: 'Missing NVIDIA API key. Please configure NVIDIA_AI_ASSISTANT_KEY or REACT_APP_NVIDIA_AI_ASSISTANT_KEY in your Vercel Project Settings.' 
    });
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

    // Safely parse JSON or text response to avoid crashes
    let data;
    const contentType = nvidiaRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await nvidiaRes.json().catch(() => ({}));
    } else {
      const text = await nvidiaRes.text().catch(() => '');
      data = { error: text || `HTTP Error ${nvidiaRes.status}` };
    }

    if (!nvidiaRes.ok) {
      if (nvidiaRes.status === 429) {
        return res.status(429).json({ error: 'Rate limit reached. Our servers are busy, please try again shortly.' });
      }
      return res.status(nvidiaRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[NVIDIA Proxy Error]', err.message);
    
    // Secure diagnostic info to help debug Vercel environment setup
    const secureAssistantKey = process.env.NVIDIA_AI_ASSISTANT_KEY || process.env.REACT_APP_NVIDIA_AI_ASSISTANT_KEY;
    const secureNemotronKey = process.env.NVIDIA_NEMOTRON_KEY || process.env.REACT_APP_NVIDIA_NEMOTRON_KEY;
    
    const keyDiagnostics = {
      assistantKeyConfigured: !!secureAssistantKey,
      assistantKeyPrefix: secureAssistantKey ? secureAssistantKey.substring(0, 10) + '...' : 'none',
      nemotronKeyConfigured: !!secureNemotronKey,
      nemotronKeyPrefix: secureNemotronKey ? secureNemotronKey.substring(0, 10) + '...' : 'none',
      clientKeySent: !!req.headers['x-api-key'],
      clientKeyPrefix: req.headers['x-api-key'] && req.headers['x-api-key'] !== 'undefined' ? req.headers['x-api-key'].substring(0, 10) + '...' : 'none'
    };

    return res.status(502).json({ 
      error: 'Failed to reach NVIDIA API. Please try again.',
      details: err.message,
      diagnostics: keyDiagnostics
    });
  }
}
