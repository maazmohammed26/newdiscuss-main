export function generateContentHash(text) {
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export function computeFinalScore(factors) {
  // factors: toxicityScore, hateSpeechScore, profanityScore, spamScore, usefulnessScore, qualityScore, threatScore
  // Each factor is 0.0 to 1.0
  const tox = factors.toxicityScore || 0;
  const hate = factors.hateSpeechScore || 0;
  const profanity = factors.profanityScore || 0;
  const spam = factors.spamScore || 0;
  const threat = factors.threatScore || 0;
  const usefulness = factors.usefulnessScore || 0;
  const quality = factors.qualityScore || 0;

  // finalScore = 100 - toxicityScore*30 - hateSpeechScore*35 - profanityScore*20 - spamScore*15 - threatScore*30 + usefulnessScore*25 + qualityScore*15
  let rawScore = 100 - (tox * 30) - (hate * 35) - (profanity * 20) - (spam * 15) - (threat * 30) + (usefulness * 25) + (quality * 15);
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

export function classifyScore(finalScore, factors) {
  const tox = factors.toxicityScore || 0;
  const hate = factors.hateSpeechScore || 0;
  const profanity = factors.profanityScore || 0;
  const spam = factors.spamScore || 0;
  const threat = factors.threatScore || 0;
  const usefulness = factors.usefulnessScore || 0;

  // Red if hateSpeechScore >= 0.75, toxicityScore >= 0.85, threatScore >= 0.75, or profanityScore >= 0.90
  if (hate >= 0.75 || tox >= 0.85 || threat >= 0.75 || profanity >= 0.90) {
    return 'Red';
  }

  // Green if finalScore >= 70 and toxicityScore < 0.40 and hateSpeechScore < 0.30 and spamScore < 0.50 and usefulnessScore >= 0.50
  if (finalScore >= 70 && tox < 0.40 && hate < 0.30 && spam < 0.50 && usefulness >= 0.50) {
    return 'Green';
  }

  return 'Yellow';
}

export function localDiscussAlgorithmFallback(text) {
  const t = text.toLowerCase();
  
  // Very basic regex-based fallback for multiple languages / masked words / repeated chars
  const profanityRegex = /f[u\*@!]+c?k|s[h\*@!]+i?t|b[i\*@!]+t?c?h|c[u\*@!]+n?t|a[s\*@!]+s|d[i\*@!]+c?k|b[a\*@!]+s?t?a?r?d/gi;
  const hateRegex = /kill|die|murder|terror|bomb|nazi|slur|chutiya|mc|bc|bsdk|madarchod|bhenchod/gi;
  
  // Count matches
  const profanityCount = (t.match(profanityRegex) || []).length;
  const hateCount = (t.match(hateRegex) || []).length;
  
  // Detect spam (URLs, excessive caps, repeated characters like "hiiiiiii")
  const urlCount = (t.match(/https?:\/\/[^\s]+/g) || []).length;
  const capsRatio = text.length > 10 ? (text.replace(/[^A-Z]/g, '').length / text.length) : 0;
  const repeatsCount = (t.match(/(.)\1{4,}/g) || []).length;
  
  let toxicityScore = 0;
  let hateSpeechScore = 0;
  let profanityScore = 0;
  let spamScore = 0;
  let threatScore = 0;
  let usefulnessScore = 0.5; // Default neutral
  let qualityScore = 0.5; // Default neutral

  // Estimate metrics based on counts
  if (profanityCount > 0) profanityScore = Math.min(1.0, 0.4 + (profanityCount * 0.2));
  if (hateCount > 0) {
    hateSpeechScore = Math.min(1.0, 0.5 + (hateCount * 0.2));
    toxicityScore = Math.min(1.0, 0.5 + (hateCount * 0.2));
    threatScore = Math.min(1.0, 0.3 + (hateCount * 0.2));
  }
  
  if (urlCount > 1 || capsRatio > 0.5 || repeatsCount > 0) {
    spamScore = Math.min(1.0, (urlCount * 0.3) + (capsRatio * 0.5) + (repeatsCount * 0.2));
    qualityScore = Math.max(0, 0.5 - spamScore);
  }

  // Length heuristic for usefulness
  if (text.length > 200 && spamScore < 0.5) {
    usefulnessScore = 0.8;
    qualityScore = 0.8;
  } else if (text.length < 20) {
    usefulnessScore = 0.2;
    qualityScore = 0.3;
  }

  const factors = {
    toxicityScore,
    hateSpeechScore,
    profanityScore,
    spamScore,
    usefulnessScore,
    qualityScore,
    threatScore
  };

  const finalScore = computeFinalScore(factors);
  const aiStatus = classifyScore(finalScore, factors);
  
  let aiReasons = "Analyzed by Discuss Algorithm (Local Fallback). ";
  if (aiStatus === 'Red') aiReasons += "Contains severe violations or hate speech.";
  else if (aiStatus === 'Yellow') aiReasons += "Content is borderline, possibly spammy, low quality, or contains mild profanity.";
  else aiReasons += "Content appears safe and standard.";

  return {
    aiScore: finalScore,
    aiStatus,
    aiReasons,
    factors,
    aiModelVersion: 'Discuss Algorithm v1.0',
    scoredBy: 'Discuss Algorithm'
  };
}
