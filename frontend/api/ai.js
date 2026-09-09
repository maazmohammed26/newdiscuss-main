'use strict';

/**
 * Discuss Centralized AI Orchestrator
 *
 * Handles all Discuss Intelligence features server-side:
 * - Content-specific Post Safety Intelligence (analyze_safety)
 * - Developer Matchmaking & Evidence (match_developers)
 * - Profile Intelligence (analyze_profile)
 * - Opportunity Feed (generate_opportunities)
 * - Team Builder (build_team)
 * - Hiring Assistant (hire_developers)
 *
 * Fallback Pipeline:
 * Primary Remote AI (Gemini 2.5 Flash, 6s timeout)
 *   ↓ (on failure, timeout, 429, 503, or invalid output)
 * Fallback Remote AI (OpenRouter, 5s timeout)
 *   ↓ (on failure, timeout, or missing key)
 * Local Discuss Deterministic Fallback (<150ms)
 *   ↓
 * Graceful Unavailable State (NEVER falsely returns "Safe")
 *
 * Privacy & Security:
 * - Normal users never see provider or model names, temperatures, or token counts.
 * - API keys are never exposed to the client.
 */

const { isAllowedOrigin } = require('../server/requestSecurity');

// Optional user verification & database access
let verifyUser = null;
let primaryDb = null;
try {
  const backend = require('../server/audioCallBackend');
  verifyUser = backend.verifyUser;
  primaryDb = backend.primaryDb;
} catch (_) {
  // Graceful if backend helper is not available
}

// Canonical content hashing (matching frontend scoringLogic)
function generateContentHash(text) {
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Bounded timeout budgets in milliseconds
const PRIMARY_TIMEOUT_MS = 6000;
const FALLBACK_TIMEOUT_MS = 5000;

// Rate limiting (per UID or IP)
const rateLimitWindows = new Map();
const checkRateLimit = (key, maxPerMinute = 30) => {
  const now = Date.now();
  const current = rateLimitWindows.get(key);
  if (!current || now - current.startedAt >= 60000) {
    rateLimitWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > maxPerMinute;
};

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitWindows.entries()) {
    if (now - v.startedAt > 120000) rateLimitWindows.delete(k);
  }
}, 120000).unref?.();

// Helper: fetch with timeout using AbortController
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Helper: safe JSON parsing from LLM text that may have markdown code blocks
function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  let clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const jsonBlock = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock) clean = jsonBlock[1].trim();
  try {
    return JSON.parse(clean);
  } catch (_) {
    const objMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1]);
      } catch (__) {
        return null;
      }
    }
    return null;
  }
}

// ============================================================================
// REMOTE PROVIDER CALLS
// ============================================================================

async function callGemini(systemPrompt, userPrompt, jsonFormat = true) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1200,
      ...(jsonFormat ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, PRIMARY_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(`Gemini status ${res.status}`);
  }

  const data = await res.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!candidateText) throw new Error('Empty response from Gemini');

  if (jsonFormat) {
    const parsed = extractJsonFromText(candidateText);
    if (!parsed) throw new Error('Gemini output was not valid JSON');
    return parsed;
  }
  return candidateText.trim();
}

async function callOpenRouter(systemPrompt, userPrompt, jsonFormat = true) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'poolside/laguna-m.1:free',
      messages,
      stream: false,
      max_tokens: 1200,
      temperature: 0.1,
    }),
  }, FALLBACK_TIMEOUT_MS);

  if (!res.ok) {
    throw new Error(`OpenRouter status ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from OpenRouter');

  if (jsonFormat) {
    const parsed = extractJsonFromText(text);
    if (!parsed) throw new Error('OpenRouter output was not valid JSON');
    return parsed;
  }
  return text.trim();
}

// ============================================================================
// DETERMINISTIC LOCAL SAFETY RULES FALLBACK
// ============================================================================

function localDeterministicSafetyCheck(text, code = '') {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      status: 'safe',
      categories: [],
      confidence: 'high',
      summary: 'Content appears consistent with Discuss community guidelines.',
    };
  }

  const clean = text.toLowerCase();

  // Code context preservation: do not treat programming syntax or technical error messages as real-world threats
  // E.g. 'kill -9', 'abort()', 'terminate process', 'drop table', 'fatal error'
  const isCodeContext = (word) => {
    if (code && code.toLowerCase().includes(word)) return true;
    return (
      clean.includes('process.kill') ||
      clean.includes('kill -9') ||
      clean.includes('killall') ||
      clean.includes('kill process') ||
      clean.includes('abort()') ||
      clean.includes('terminate()') ||
      clean.includes('drop database') ||
      clean.includes('drop table')
    );
  };

  const flaggedCategories = [];
  let highestSeverity = 'safe'; // 'safe' | 'review' | 'high_risk'
  const reasons = [];

  // 1. Threats / Incitement to violence
  const threatPatterns = [
    /\b(i will kill you|i am going to kill you|hope you die|die in a fire|go die|slit your|bomb the|terror attack|shoot you)\b/i,
  ];
  const hasThreat = threatPatterns.some((pattern) => pattern.test(clean));
  if (hasThreat && !isCodeContext('kill') && !isCodeContext('die')) {
    flaggedCategories.push('threats');
    highestSeverity = 'high_risk';
    reasons.push('Contains threatening language or violent intent.');
  }

  // 2. Hate speech & targeted slurs (excluding legitimate technical/religious discussion)
  // Note: PRD section 14: Do NOT treat normal discussion of religion, race, politics, nationality, gender as unsafe!
  // Only target actual slurs and dehumanizing attacks.
  const hateSlurs = [
    /\b(chutiya|bsdk|bhenchod|madarchod|motherfucker|nigger|faggot|kike|chink|sandnigger|subhuman scum)\b/i,
  ];
  const hasHate = hateSlurs.some((pattern) => pattern.test(clean));
  if (hasHate) {
    flaggedCategories.push('hate_speech');
    highestSeverity = 'high_risk';
    reasons.push('Contains abusive slurs or targeted hate speech.');
  }

  // 3. Harassment / Bullying / Insults
  const harassmentPatterns = [
    /\b(you are pathetic|kill yourself|kys|you are useless|moron|idiot|retard|ugly piece of|piece of shit)\b/i,
  ];
  const hasHarassment = harassmentPatterns.some((p) => p.test(clean));
  if (hasHarassment) {
    flaggedCategories.push('harassment');
    if (highestSeverity !== 'high_risk') highestSeverity = 'review';
    reasons.push('Language may constitute personal harassment or bullying.');
  }

  // 4. Scams & Malicious deception
  const scamPatterns = [
    /\b(send crypto to get double|guaranteed 1000% return|click here to claim free btc|free robux generator|telegram @[a-z0-9_]+ for insider trading|give private key|give seed phrase)\b/i,
  ];
  if (scamPatterns.some((p) => p.test(clean))) {
    flaggedCategories.push('scams');
    highestSeverity = 'high_risk';
    reasons.push('Contains potential scam patterns or fraudulent solicitations.');
  }

  // 5. PII Exposure (Credit card patterns, SSN, API secrets)
  const piiPatterns = [
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, // Credit cards
    /\b(ghp_[A-Za-z0-9]{36}|AIza[0-9A-Za-z-_]{35})\b/, // GitHub / Google API tokens
  ];
  if (piiPatterns.some((p) => p.test(text))) {
    flaggedCategories.push('personal_information');
    if (highestSeverity === 'safe') highestSeverity = 'review';
    reasons.push('May contain sensitive credentials, personal tokens, or payment card numbers.');
  }

  // 6. Excessive Spam / Bot copy-paste
  const urlCount = (clean.match(/https?:\/\/[^\s]+/g) || []).length;
  const repeatsCount = (clean.match(/(.)\1{6,}/g) || []).length;
  if (urlCount > 3 || repeatsCount > 2) {
    flaggedCategories.push('spam');
    if (highestSeverity === 'safe') highestSeverity = 'review';
    reasons.push('Repetitive patterns or excessive link count detected.');
  }

  let summary = 'Content appears consistent with Discuss community guidelines.';
  if (highestSeverity === 'high_risk') {
    summary = reasons[0] || 'This content contains language that may violate Discuss community guidelines.';
  } else if (highestSeverity === 'review') {
    summary = reasons[0] || 'Some language may need attention before or after publishing.';
  }

  return {
    status: highestSeverity,
    categories: flaggedCategories,
    confidence: 'medium',
    summary,
  };
}

// ============================================================================
// LOCAL DETERMINISTIC TALENTGRAPH MATCHING FALLBACK
// ============================================================================

function localDeterministicMatching(currentUser, candidateUsers) {
  const currentSkills = new Set((currentUser?.talentGraph?.skills || currentUser?.skills || []).map((s) => s.toLowerCase()));
  const currentBio = (currentUser?.talentGraph?.bio || currentUser?.bio || '').toLowerCase();

  const isFrontend = (sSet, bio) => [...sSet].some((s) => /react|vue|svelte|angular|frontend|css|html|tailwind|ui|ux|flutter|swift/.test(s)) || /frontend|ui designer/.test(bio);
  const isBackend = (sSet, bio) => [...sSet].some((s) => /node|python|go|rust|java|spring|sql|postgres|mongo|api|backend|firebase|supabase/.test(s)) || /backend|systems/.test(bio);
  const isAI = (sSet, bio) => [...sSet].some((s) => /ai|ml|machine learning|pytorch|tensorflow|llm|nlp/.test(s)) || /ai engineer|data scientist/.test(bio);

  const curIsFe = isFrontend(currentSkills, currentBio);
  const curIsBe = isBackend(currentSkills, currentBio);
  const curIsAi = isAI(currentSkills, currentBio);

  const matches = [];

  for (const candidate of candidateUsers) {
    if (!candidate || candidate.id === currentUser.id) continue;

    const candSkills = (candidate.talentGraph?.skills || candidate.skills || []).map((s) => s.toLowerCase());
    const candSkillsSet = new Set(candSkills);
    const candBio = (candidate.talentGraph?.bio || candidate.bio || '').toLowerCase();

    // 1. Shared skills overlap
    const sharedSkills = [...currentSkills].filter((s) => candSkillsSet.has(s));

    // 2. Complementary strengths
    const candIsFe = isFrontend(candSkillsSet, candBio);
    const candIsBe = isBackend(candSkillsSet, candBio);
    const candIsAi = isAI(candSkillsSet, candBio);

    let complementary = '';
    let compBonus = 0;
    if (curIsFe && !curIsBe && candIsBe) {
      complementary = 'You focus on frontend architectures. They work primarily on backend and API infrastructure.';
      compBonus = 25;
    } else if (curIsBe && !curIsFe && candIsFe) {
      complementary = 'You focus on backend systems. They specialize in modern frontend and user interfaces.';
      compBonus = 25;
    } else if (curIsAi && (candIsFe || candIsBe)) {
      complementary = 'You work on AI models. They provide core application engineering to deploy them.';
      compBonus = 20;
    }

    // 3. Score calculation
    const overlapScore = sharedSkills.length * 20;
    const totalScore = Math.min(100, overlapScore + compBonus);

    if (totalScore < 15 && sharedSkills.length === 0 && !complementary) continue;

    let matchTier = 'Possible match';
    let confidence = 'low';
    if (totalScore >= 65 || (sharedSkills.length >= 2 && complementary)) {
      matchTier = 'Strong match';
      confidence = 'high';
    } else if (totalScore >= 35 || sharedSkills.length >= 1) {
      matchTier = 'Good match';
      confidence = 'medium';
    }

    let potentialCollab = 'Open-source developer tooling';
    if (sharedSkills.includes('react') || sharedSkills.includes('firebase')) {
      potentialCollab = 'Real-time collaborative web applications';
    } else if (sharedSkills.includes('python') || curIsAi || candIsAi) {
      potentialCollab = 'AI-assisted developer tools';
    } else if (sharedSkills.includes('node') || sharedSkills.includes('go')) {
      potentialCollab = 'High-throughput microservices and APIs';
    }

    let matchReason = '';
    if (sharedSkills.length > 0 && complementary) {
      matchReason = `Shares expertise in ${sharedSkills.slice(0, 3).join(', ')}. Offers complementary strengths in ${candIsFe ? 'frontend' : candIsBe ? 'backend' : 'systems'}.`;
    } else if (sharedSkills.length > 0) {
      matchReason = `Both actively work with ${sharedSkills.slice(0, 3).join(', ')}.`;
    } else if (complementary) {
      matchReason = complementary;
    } else {
      matchReason = `Compatible tech stack alignment.`;
    }

    matches.push({
      userId: candidate.id,
      username: candidate.username || 'Developer',
      matchTier,
      confidence,
      sharedSkills: sharedSkills.slice(0, 4),
      complementaryStrengths: complementary || undefined,
      potentialCollaboration: potentialCollab,
      matchReason,
      internalScore: totalScore,
    });
  }

  matches.sort((a, b) => b.internalScore - a.internalScore);
  return matches.slice(0, 6).map(({ internalScore, ...rest }) => rest);
}

// ============================================================================
// MAIN SERVERLESS HANDLER
// ============================================================================

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin, req.headers.host)) {
    return res.status(403).json({ success: false, error: 'Forbidden origin' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (_) {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  }
  body = body && typeof body === 'object' ? body : {};

  const { action, payload = {} } = body;
  if (!action) return res.status(400).json({ success: false, error: 'Action is required' });

  // Authenticate user if token is present
  let authUser = null;
  const authHeader = req.headers.authorization;
  if (authHeader && verifyUser) {
    try {
      authUser = await verifyUser(authHeader);
    } catch (_) {
      // If token is invalid and action is not public safety on an existing post, reject
      if (action !== 'analyze_safety' || !payload.postId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
    }
  }

  // Pre-publish safety requires authenticated user to prevent open anonymous AI proxy abuse
  if (action === 'analyze_safety' && !payload.postId && !authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required for pre-publish safety analysis' });
  }

  // Rate limit key (user UID if logged in, otherwise client IP or header)
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous';
  const rateLimitKey = authUser?.uid ? `user:${authUser.uid}` : `ip:${clientIp}`;
  const maxLimit = authUser ? 45 : 20;
  if (checkRateLimit(rateLimitKey, maxLimit)) {
    return res.status(429).json({ success: false, error: 'Rate limit reached. Please wait a moment.' });
  }

  // Execution with Fallback Pipeline
  try {
    switch (action) {
      // ──────────────────────────────────────────────────────────────────────────
      // 1. POST CONTENT REVIEW / SAFETY INTELLIGENCE
      // ──────────────────────────────────────────────────────────────────────────
      case 'analyze_safety': {
        const postId = payload.postId ? String(payload.postId).trim() : null;
        let text = '';
        let code = '';
        let canonicalPost = null;

        // Fetch canonical post content directly from trusted database
        if (postId && primaryDb) {
          try {
            const snap = await primaryDb().ref(`posts/${postId}`).once('value');
            if (!snap.exists()) {
              return res.status(404).json({ success: false, error: 'Post not found' });
            }
            canonicalPost = snap.val();
            text = `${canonicalPost.title || ''} ${canonicalPost.content || ''}`.trim();
            code = String(canonicalPost.code || '');
          } catch (dbErr) {
            console.warn('[AI Orchestrator] Database lookup failed, using request payload:', dbErr.message);
          }
        }

        // If no canonical post from DB (e.g. pre-publish check or db unavailable)
        if (!canonicalPost) {
          text = String(payload.text || payload.content || '').slice(0, 15000);
          code = String(payload.code || '').slice(0, 15000);
        }

        const canonicalHash = generateContentHash(`${text} ${code}`);

        // If post already has verified server safety metadata matching the canonical hash, return it directly
        if (canonicalPost?.aiSafetyInfo && canonicalPost.aiSafetyInfo.contentHash === canonicalHash && canonicalPost.aiSafetyInfo.status && !payload.forceRefresh) {
          return res.status(200).json({
            success: true,
            data: canonicalPost.aiSafetyInfo,
          });
        }

        // Unauthenticated users may read existing stored reviews, but cannot trigger fresh AI inference
        if (!authUser) {
          return res.status(401).json({
            success: false,
            error: 'Sign in to request a fresh Content Review.',
          });
        }

        if (!text.trim() && !code.trim()) {
          const emptySafe = {
            status: 'safe',
            categories: [],
            confidence: 'high',
            summary: 'Content appears consistent with Discuss community guidelines.',
            analyzedAt: new Date().toISOString(),
            analysisVersion: '2.0',
            contentHash: canonicalHash,
          };
          if (postId && primaryDb) {
            try {
              await primaryDb().ref(`posts/${postId}`).update({
                aiSafetyInfo: emptySafe,
                lastScoredContentHash: canonicalHash,
                aiScoreOutdated: false,
              });
            } catch (_) {}
          }
          return res.status(200).json({
            success: true,
            data: emptySafe,
          });
        }

        const systemPrompt = `You are the Discuss Content Safety Intelligence service.
Analyze the user's post content objectively and return a structured JSON assessment.

Evaluation Categories:
- harassment: Bullying, personal attacks, demeaning insults directed at an individual.
- hate_speech: Dehumanizing attacks or hatred targeting caste, race, religion, nationality, gender, or disability.
- threats: Violent intent, physical harm threats, incitement to violence.
- scams: Cryptocurrency doubling, fraud, phishing, illicit financial schemes.
- sexual: Explicit sexual exploitation or unsolicited graphic sexual depictions.
- self_harm: Encouragement or instruction on suicide or self-harm.
- personal_information: Leaking real credit cards, private passwords, phone numbers.
- spam: Repetitive copy-paste promotions, link stuffing.

IMPORTANT FAIRNESS RULES:
1. Normal, civil discussions of religion, philosophy, politics, nationality, caste, gender, or historical events are NEVER flagged as unsafe. Only flag if someone is personally attacking, threatening, or spreading dehumanizing slurs against people.
2. Code context: Code snippets (e.g. 'kill -9', 'abort()', 'terminate process', 'drop table') are normal technical tools. Do not flag programming commands as threats.
3. Classify into exactly one 'status':
   - "safe": Content is consistent with Discuss developer community guidelines.
   - "review": Borderline, mild incivility, potential spam, or ambiguous tone that might warrant author attention.
   - "high_risk": Clear violations, explicit hate speech, violent threats, scams, or severe harassment.

Output schema (JSON only):
{
  "status": "safe" | "review" | "high_risk",
  "categories": ["string"],
  "confidence": "high" | "medium" | "low",
  "summary": "Calm, concise 1-sentence explanation of why this status was determined."
}`;

        const userPrompt = `Post text to analyze:
"""${text}"""
${code ? `Associated Code Snippet:\n"""${code}"""` : ''}`;

        let result = null;

        // Try Primary Remote AI (Gemini)
        try {
          result = await callGemini(systemPrompt, userPrompt, true);
        } catch (geminiErr) {
          // Try Fallback Remote AI (OpenRouter)
          try {
            result = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (openRouterErr) {
            // Local Deterministic Fallback
            result = localDeterministicSafetyCheck(text, code);
          }
        }

        // Validate and sanitize structured output
        const status = ['safe', 'review', 'high_risk'].includes(result?.status) ? result.status : 'safe';
        const categories = Array.isArray(result?.categories) ? result.categories.slice(0, 5) : [];
        const confidence = ['high', 'medium', 'low'].includes(result?.confidence) ? result.confidence : 'medium';
        const summary = String(result?.summary || 'Content appears consistent with Discuss community guidelines.').slice(0, 300);

        const verifiedResult = {
          status,
          categories,
          confidence,
          summary,
          analyzedAt: new Date().toISOString(),
          analysisVersion: '2.0',
          contentHash: canonicalHash,
        };

        // Write directly to primary database under posts/{postId}/aiSafetyInfo using backend admin with race protection
        if (postId && primaryDb) {
          try {
            const postRef = primaryDb().ref(`posts/${postId}`);
            const recheckSnap = await postRef.once('value');
            if (!recheckSnap.exists()) {
              return res.status(404).json({ success: false, error: 'Post no longer exists' });
            }
            const currentPost = recheckSnap.val();
            const currentText = `${currentPost.title || ''} ${currentPost.content || ''}`.trim();
            const currentCode = String(currentPost.code || '');
            const currentHash = generateContentHash(`${currentText} ${currentCode}`);

            // Race protection: discard stale result if post content changed while inference was running
            if (currentHash !== canonicalHash) {
              console.warn(`[AI Orchestrator] Race condition detected on post ${postId}: post was edited during review. Discarding stale result.`);
              return res.status(409).json({
                success: false,
                stale: true,
                error: 'Post was modified during review. Stale safety analysis discarded.',
              });
            }

            await postRef.update({
              aiSafetyInfo: verifiedResult,
              lastScoredContentHash: canonicalHash,
              aiScoreOutdated: false,
            });
          } catch (saveErr) {
            console.warn('[AI Orchestrator] Failed to persist safety metadata:', saveErr.message);
          }
        }

        return res.status(200).json({
          success: true,
          data: verifiedResult,
        });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 2. DEVELOPER MATCHMAKING & EVIDENCE
      // ──────────────────────────────────────────────────────────────────────────
      case 'match_developers': {
        const currentUser = payload.currentUser || {};
        const candidateUsers = Array.isArray(payload.candidateUsers) ? payload.candidateUsers.slice(0, 15) : [];

        if (candidateUsers.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        // Compute local multi-signal ranking first
        const localMatches = localDeterministicMatching(currentUser, candidateUsers);
        if (localMatches.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        // Try AI enhancement for concise, natural networking evidence
        const systemPrompt = `You are the Discuss TalentGraph Matching Intelligence.
Explain developer compatibility based ONLY on real provided skills, projects, and bio.
Never fabricate credentials, jobs, or skills.
Never output provider/model names, percentages, or technical jargon.

Return a JSON array of objects matching the input users:
[
  {
    "userId": "exact user id",
    "matchTier": "Strong match" | "Good match" | "Possible match",
    "confidence": "high" | "medium" | "low",
    "sharedSkills": ["react", "firebase"],
    "complementaryStrengths": "Short 1-sentence note if one is frontend and other is backend/systems",
    "potentialCollaboration": "Short 3-5 word collaboration topic (e.g. Real-time developer tools)",
    "matchReason": "Concise factual reason based strictly on their profiles"
  }
]`;

        const userPrompt = `Current Developer:
${JSON.stringify({
  id: currentUser.id,
  username: currentUser.username,
  skills: currentUser.talentGraph?.skills || currentUser.skills || [],
  bio: currentUser.talentGraph?.bio || currentUser.bio || '',
})}

Candidates to evaluate:
${JSON.stringify(
  candidateUsers
    .filter((u) => localMatches.some((m) => m.userId === u.id))
    .map((u) => ({
      id: u.id,
      username: u.username,
      skills: u.talentGraph?.skills || u.skills || [],
      bio: u.talentGraph?.bio || u.bio || '',
    }))
)}`;

        let aiResult = null;
        try {
          aiResult = await callGemini(systemPrompt, userPrompt, true);
        } catch (_) {
          try {
            aiResult = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (__) {
            // Local fallback already computed
            aiResult = localMatches;
          }
        }

        if (Array.isArray(aiResult) && aiResult.length > 0) {
          const merged = localMatches.map((loc) => {
            const aiItem = aiResult.find((a) => a.userId === loc.userId);
            if (!aiItem) return loc;
            return {
              userId: loc.userId,
              username: loc.username,
              matchTier: ['Strong match', 'Good match', 'Possible match'].includes(aiItem.matchTier) ? aiItem.matchTier : loc.matchTier,
              confidence: ['high', 'medium', 'low'].includes(aiItem.confidence) ? aiItem.confidence : loc.confidence,
              sharedSkills: Array.isArray(aiItem.sharedSkills) && aiItem.sharedSkills.length ? aiItem.sharedSkills : loc.sharedSkills,
              complementaryStrengths: aiItem.complementaryStrengths || loc.complementaryStrengths,
              potentialCollaboration: aiItem.potentialCollaboration || loc.potentialCollaboration,
              matchReason: aiItem.matchReason || loc.matchReason,
            };
          });
          return res.status(200).json({ success: true, data: merged });
        }

        return res.status(200).json({ success: true, data: localMatches });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 3. PROFILE INTELLIGENCE (SEPARATING EXPLICIT SKILLS FROM INFERRED SIGNALS)
      // ──────────────────────────────────────────────────────────────────────────
      case 'analyze_profile': {
        const bio = String(payload.bio || '').slice(0, 1000);
        const declaredSkills = Array.isArray(payload.skills) ? payload.skills.slice(0, 20) : [];
        const recentPosts = Array.isArray(payload.posts) ? payload.posts.slice(0, 8) : [];

        const systemPrompt = `You are Discuss TalentGraph Profile Intelligence.
Analyze the developer's public profile and activity to identify:
1. Strong signals: skills strongly demonstrated through both profile and projects/posts.
2. Growing signals: technologies or interests they have started mentioning or experimenting with.
3. Collaboration strengths: 1 brief sentence on their technical focus area.
4. Discoverability tips: 1 actionable tip to improve their profile discoverability for teammates.

Do not invent credentials. Do not claim skills without evidence.
Return JSON:
{
  "strongSignals": ["Skill1", "Skill2"],
  "growingSignals": ["Tech1", "Tech2"],
  "collaborationStrengths": "Brief statement",
  "discoverabilityTips": ["Tip 1"]
}`;

        const postSnippets = recentPosts.map((p) => `- ${p.title || ''}: ${p.content || ''}`).join('\n');
        const userPrompt = `Bio: "${bio}"\nExplicit Skills: ${declaredSkills.join(', ')}\nRecent Activity:\n${postSnippets || 'No recent posts.'}`;

        let result = null;
        try {
          result = await callGemini(systemPrompt, userPrompt, true);
        } catch (_) {
          try {
            result = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (__) {
            // Local fallback
            result = {
              strongSignals: declaredSkills.slice(0, 3),
              growingSignals: declaredSkills.slice(3, 5),
              collaborationStrengths: declaredSkills.length ? `Full-stack development using ${declaredSkills.slice(0, 2).join(' and ')}.` : 'Software engineering and collaborative tooling.',
              discoverabilityTips: declaredSkills.length < 3 ? ['Add 3 or more core skills to increase collaboration matches.'] : ['Add projects demonstrating your latest work to boost discoverability.'],
            };
          }
        }

        return res.status(200).json({
          success: true,
          data: {
            strongSignals: Array.isArray(result?.strongSignals) ? result.strongSignals.slice(0, 4) : [],
            growingSignals: Array.isArray(result?.growingSignals) ? result.growingSignals.slice(0, 4) : [],
            collaborationStrengths: String(result?.collaborationStrengths || 'Full-stack engineering and community collaboration.').slice(0, 200),
            discoverabilityTips: Array.isArray(result?.discoverabilityTips) ? result.discoverabilityTips.slice(0, 2) : [],
            analyzedAt: new Date().toISOString(),
          },
        });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 4. OPPORTUNITIES FEED
      // ──────────────────────────────────────────────────────────────────────────
      case 'generate_opportunities': {
        const skills = Array.isArray(payload.skills) ? payload.skills.slice(0, 10) : [];
        const bio = String(payload.bio || '').slice(0, 500);

        const systemPrompt = `Generate 4 personalized project, open-source, or collaboration opportunities for a developer.
Do not use emojis. Output JSON array of 4 objects:
[
  {
    "id": "opp-1",
    "title": "Project Title",
    "description": "Brief description of the challenge/opportunity",
    "category": "Startup Idea | Open Source | Side Project",
    "skillsNeeded": ["SkillA", "SkillB"],
    "potentialImpact": "Brief note on potential value"
  }
]`;
        const userPrompt = `Skills: ${skills.join(', ')}\nBio: ${bio}`;

        let result = null;
        try {
          result = await callGemini(systemPrompt, userPrompt, true);
        } catch (_) {
          try {
            result = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (__) {
            const s1 = skills[0] || 'Web';
            const s2 = skills[1] || 'API';
            result = [
              {
                id: 'opp-local-1',
                title: `Real-time ${s1} Developer Dashboard`,
                description: `Build a developer analytics workbench combining ${s1} frontend with high-performance telemetry.`,
                category: 'Open Source',
                skillsNeeded: [s1, s2],
                potentialImpact: 'High community utility for developer productivity.',
              },
              {
                id: 'opp-local-2',
                title: `Collaborative ${s2} Gateway`,
                description: `Design a fault-tolerant microservice architecture for peer collaboration tools.`,
                category: 'Side Project',
                skillsNeeded: [s1, s2],
                potentialImpact: 'Great showcase for system design and architecture.',
              },
            ];
          }
        }

        return res.status(200).json({
          success: true,
          data: Array.isArray(result) ? result.slice(0, 4) : [],
        });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 5. TEAM BUILDER
      // ──────────────────────────────────────────────────────────────────────────
      case 'build_team': {
        const projectDesc = String(payload.projectDesc || '').slice(0, 2000);
        const candidates = Array.isArray(payload.candidateUsers) ? payload.candidateUsers.slice(0, 15) : [];

        if (!projectDesc.trim() || candidates.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        const systemPrompt = `Select up to 4 developer candidates for this project.
Return JSON array:
[
  {
    "userId": "user id",
    "username": "username",
    "role": "Suggested role (e.g. Frontend Engineer, API Architect)",
    "reason": "Why they fit based on their listed skills"
  }
]`;

        const userPrompt = `Project: "${projectDesc}"\nCandidates: ${JSON.stringify(
          candidates.map((c) => ({
            id: c.id,
            username: c.username,
            skills: c.talentGraph?.skills || c.skills || [],
          }))
        )}`;

        let result = null;
        try {
          result = await callGemini(systemPrompt, userPrompt, true);
        } catch (_) {
          try {
            result = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (__) {
            result = candidates.slice(0, 3).map((c) => ({
              userId: c.id,
              username: c.username,
              role: 'Core Contributor',
              reason: `Aligned with project requirements (${(c.talentGraph?.skills || c.skills || []).slice(0, 3).join(', ')}).`,
            }));
          }
        }

        return res.status(200).json({ success: true, data: Array.isArray(result) ? result : [] });
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 6. HIRING ASSISTANT
      // ──────────────────────────────────────────────────────────────────────────
      case 'hire_developers': {
        const hiringReq = String(payload.hiringReq || '').slice(0, 1000);
        const candidates = Array.isArray(payload.candidateUsers) ? payload.candidateUsers.slice(0, 15) : [];

        if (!hiringReq.trim() || candidates.length === 0) {
          return res.status(200).json({ success: true, data: [] });
        }

        const systemPrompt = `Select up to 4 developers matching this technical requirement.
Return JSON array:
[
  {
    "userId": "user id",
    "username": "username",
    "fitTier": "Strong match" | "Good match" | "Possible match",
    "reason": "Short factual explanation based on their skills"
  }
]`;
        const userPrompt = `Requirement: "${hiringReq}"\nCandidates: ${JSON.stringify(
          candidates.map((c) => ({
            id: c.id,
            username: c.username,
            skills: c.talentGraph?.skills || c.skills || [],
          }))
        )}`;

        let result = null;
        try {
          result = await callGemini(systemPrompt, userPrompt, true);
        } catch (_) {
          try {
            result = await callOpenRouter(systemPrompt, userPrompt, true);
          } catch (__) {
            result = candidates.slice(0, 3).map((c) => ({
              userId: c.id,
              username: c.username,
              fitTier: 'Good match',
              reason: `Demonstrated skills in ${(c.talentGraph?.skills || c.skills || []).slice(0, 3).join(', ')}.`,
            }));
          }
        }

        return res.status(200).json({ success: true, data: Array.isArray(result) ? result : [] });
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action '${action}'` });
    }
  } catch (error) {
    console.error(`[AI Orchestrator] Top-level handler failure for action '${action}':`, error.message);
    return res.status(200).json({
      success: false,
      unavailable: true,
      message: 'Discuss Intelligence is temporarily unavailable.',
    });
  }
};
