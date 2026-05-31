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

  // We ignore any key sent by the client for security.
  // We ALWAYS use the secure environment variables directly from Vercel's edge environment.
  const isSafety = req.body?.model?.includes('nemotron') || req.body?.model?.includes('safety');
  
  let secureAssistantKey = process.env.NVIDIA_AI_ASSISTANT_KEY || process.env.REACT_APP_NVIDIA_AI_ASSISTANT_KEY || '';
  let secureNemotronKey = process.env.NVIDIA_NEMOTRON_KEY || process.env.REACT_APP_NVIDIA_NEMOTRON_KEY || '';
  
  // Clean keys in case user accidentally copy-pasted quotes into Vercel env settings
  secureAssistantKey = secureAssistantKey.replace(/['"]/g, '').trim();
  secureNemotronKey = secureNemotronKey.replace(/['"]/g, '').trim();
  
  let apiKey = '';
  if (isSafety) {
    apiKey = secureNemotronKey || secureAssistantKey;
  } else {
    apiKey = secureAssistantKey || secureNemotronKey;
  }

  if (!apiKey) {
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
      // If NVIDIA rejects the key itself
      if (nvidiaRes.status === 401 || nvidiaRes.status === 403) {
        data.help = "Your NVIDIA API key might be invalid, expired, or lacking permissions for this model. Please check your Vercel Environment Variables.";
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
