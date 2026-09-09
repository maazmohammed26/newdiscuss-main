import { executeAiAction } from './aiOrchestratorClient';
import { generateContentHash } from './scoringLogic';

// In-memory cache keyed by contentHash
const safetyCache = new Map();

/**
 * Local deterministic rule-based safety evaluation as client-side fallback
 */
export function localRuleSafetyCheck(text = '', code = '') {
  const clean = String(text || '').toLowerCase();

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

  const categories = [];
  let status = 'safe';
  let summary = 'Content appears consistent with Discuss community guidelines.';

  // Threats
  const threatPatterns = [
    /\b(i will kill you|i am going to kill you|hope you die|die in a fire|go die|slit your|bomb the|terror attack|shoot you)\b/i,
  ];
  if (threatPatterns.some((p) => p.test(clean)) && !isCodeContext('kill') && !isCodeContext('die')) {
    categories.push('threats');
    status = 'high_risk';
    summary = 'Contains threatening language or violent intent.';
  }

  // Targeted slurs & hate speech
  const hateSlurs = [
    /\b(chutiya|bsdk|bhenchod|madarchod|motherfucker|nigger|faggot|kike|chink|sandnigger|subhuman scum)\b/i,
  ];
  if (hateSlurs.some((p) => p.test(clean))) {
    categories.push('hate_speech');
    status = 'high_risk';
    summary = 'Contains abusive slurs or targeted hate speech.';
  }

  // Harassment
  const harassmentPatterns = [
    /\b(you are pathetic|kill yourself|kys|you are useless|moron|idiot|retard|ugly piece of|piece of shit)\b/i,
  ];
  if (harassmentPatterns.some((p) => p.test(clean)) && status !== 'high_risk') {
    categories.push('harassment');
    status = 'review';
    summary = 'Language may constitute personal harassment or hostility.';
  }

  // Scams
  const scamPatterns = [
    /\b(send crypto to get double|guaranteed 1000% return|click here to claim free btc|free robux generator|telegram @[a-z0-9_]+ for insider trading|give private key|give seed phrase)\b/i,
  ];
  if (scamPatterns.some((p) => p.test(clean))) {
    categories.push('scams');
    status = 'high_risk';
    summary = 'Contains suspicious scam patterns or illicit solicitations.';
  }

  // PII
  const piiPatterns = [
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/,
    /\b(ghp_[A-Za-z0-9]{36}|AIza[0-9A-Za-z-_]{35})\b/,
  ];
  if (piiPatterns.some((p) => p.test(text))) {
    categories.push('personal_information');
    if (status === 'safe') status = 'review';
    summary = 'Contains potential credentials or personal identifier information.';
  }

  return {
    status,
    categories,
    confidence: 'medium',
    summary,
    analyzedAt: new Date().toISOString(),
    analysisVersion: '2.0',
    fallbackUsed: true,
  };
}

/**
 * Analyze post content for safety
 */
export async function evaluatePostSafety(text = '', code = '', options = {}) {
  const { forceRefresh = false, existingSafetyInfo = null, postId = null } = options;
  const contentHash = generateContentHash(`${text} ${code}`);

  // 1. Check existing cached safety on post if valid and matching hash
  if (!forceRefresh && existingSafetyInfo && existingSafetyInfo.contentHash === contentHash && existingSafetyInfo.status) {
    return existingSafetyInfo;
  }

  // 2. Check local in-memory cache
  if (!forceRefresh && safetyCache.has(contentHash)) {
    return safetyCache.get(contentHash);
  }

  // 3. Request from centralized orchestrator
  try {
    const result = await executeAiAction(
      'analyze_safety',
      { postId, text, code, forceRefresh },
      {
        dedupeKey: postId ? `safety-post-${postId}-${contentHash}` : `safety-${contentHash}`,
        requiresAuth: !postId, // Pre-publish checks require authenticated user
      }
    );

    if (result && !result.unavailable && result.status) {
      const formatted = {
        status: result.status,
        categories: result.categories || [],
        confidence: result.confidence || 'medium',
        summary: result.summary || 'Content appears consistent with Discuss community guidelines.',
        analyzedAt: result.analyzedAt || new Date().toISOString(),
        analysisVersion: result.analysisVersion || '2.0',
        contentHash: result.contentHash || contentHash,
      };
      safetyCache.set(contentHash, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('[SafetyService] Orchestrator call failed, evaluating via local rules:', err.message);
  }

  // 4. Local rule fallback
  const localResult = localRuleSafetyCheck(text, code);
  localResult.contentHash = contentHash;
  safetyCache.set(contentHash, localResult);
  return localResult;
}

/**
 * Invalidate cached safety score (e.g. when post is edited)
 */
export function invalidateSafetyCache(text = '', code = '') {
  const contentHash = generateContentHash(`${text} ${code}`);
  safetyCache.delete(contentHash);
}
