import { executeAiAction } from './aiOrchestratorClient';

const KNOWN_SKILLS = [
  'react', 'node.js', 'node', 'python', 'cybersecurity', 'data science',
  'ai/ml', 'ai', 'ml', 'firebase', 'supabase', 'flutter', 'devops', 'ui/ux', 'cloud',
  'javascript', 'typescript', 'vue', 'angular', 'svelte', 'react native', 'express',
  'django', 'flask', 'fastapi', 'java', 'spring', 'go', 'golang', 'rust', 'c++',
  'c#', 'dotnet', 'sql', 'mysql', 'postgresql', 'mongodb', 'aws', 'docker',
  'kubernetes', 'html', 'css', 'swift', 'kotlin', 'figma', 'design', 'ui', 'ux',
  'solidity', 'web3', 'machine learning', 'pytorch', 'tensorflow', 'nlp', 'security'
];

/**
 * Extract technical terms and skills from free text
 */
export function extractSkillsFromText(text = '') {
  if (!text) return [];
  const clean = text.toLowerCase();
  const found = new Set();
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(clean) || clean.includes(skill)) {
      found.add(skill);
    }
  }
  return Array.from(found);
}

/**
 * Categorize skills into technical domains
 */
function getDomainProfile(skills = [], bio = '') {
  const set = new Set(skills.map((s) => s.toLowerCase()));
  const b = (bio || '').toLowerCase();

  const isFrontend =
    [...set].some((s) => /react|vue|svelte|angular|frontend|css|html|ui|ux|flutter|swift/.test(s)) ||
    /frontend|ui engineer/.test(b);

  const isBackend =
    [...set].some((s) => /node|python|go|rust|java|spring|sql|postgres|mongo|api|backend|firebase|supabase/.test(s)) ||
    /backend|systems engineer/.test(b);

  const isAI =
    [...set].some((s) => /ai|ml|machine learning|pytorch|tensorflow|llm|nlp/.test(s)) ||
    /ai engineer|data scientist/.test(b);

  const isDevOps =
    [...set].some((s) => /docker|kubernetes|aws|cloud|devops|ci\/cd|linux/.test(s)) ||
    /devops|infrastructure/.test(b);

  return { isFrontend, isBackend, isAI, isDevOps };
}

/**
 * Multi-signal weighted matching algorithm
 */
export function computeWeightedDeveloperMatches(currentUser, candidateUsers = [], options = {}) {
  const { existingChatPartnerIds = new Set() } = options;

  const currentSkills = (currentUser?.talentGraph?.skills || currentUser?.skills || []).map((s) => s.toLowerCase());
  const currentSkillsSet = new Set(currentSkills);
  const currentBio = currentUser?.talentGraph?.bio || currentUser?.bio || '';
  const currentDomain = getDomainProfile(currentSkills, currentBio);

  const results = [];

  for (const candidate of candidateUsers) {
    if (!candidate || candidate.id === currentUser?.id) continue;
    if (candidate.isBlocked) continue;

    const candSkills = (candidate.talentGraph?.skills || candidate.skills || []).map((s) => s.toLowerCase());
    const candSkillsSet = new Set(candSkills);
    const candBio = candidate.talentGraph?.bio || candidate.bio || '';
    const candDomain = getDomainProfile(candSkills, candBio);

    // 1. Exact skill overlap
    const sharedSkills = currentSkills.filter((s) => candSkillsSet.has(s));
    const overlapScore = sharedSkills.length * 20;

    // 2. Complementary strengths
    let complementaryStrengths = '';
    let compBonus = 0;
    if (currentDomain.isFrontend && !currentDomain.isBackend && candDomain.isBackend) {
      complementaryStrengths = 'You specialize in frontend interfaces. They focus on backend and API infrastructure.';
      compBonus = 25;
    } else if (currentDomain.isBackend && !currentDomain.isFrontend && candDomain.isFrontend) {
      complementaryStrengths = 'You focus on backend services. They work primarily on frontend applications and UI.';
      compBonus = 25;
    } else if (currentDomain.isAI && (candDomain.isFrontend || candDomain.isBackend)) {
      complementaryStrengths = 'You develop AI capabilities. They provide application infrastructure to deploy them.';
      compBonus = 20;
    } else if (candDomain.isDevOps && (currentDomain.isFrontend || currentDomain.isBackend)) {
      complementaryStrengths = 'Complementary development and infrastructure expertise.';
      compBonus = 15;
    }

    // 3. Activity signals
    const candPostCount = candidate.postCount || candidate.posts_count || 0;
    const activityBonus = Math.min(10, candPostCount * 2);

    // 4. Proximity bonus (optional DevRadar coordinates, never dominant)
    let proximityBonus = 0;
    if (
      currentUser?.latitude && currentUser?.longitude &&
      candidate?.latitude && candidate?.longitude
    ) {
      const dLat = Math.abs(currentUser.latitude - candidate.latitude);
      const dLon = Math.abs(currentUser.longitude - candidate.longitude);
      if (dLat < 0.5 && dLon < 0.5) proximityBonus = 5;
    }

    const totalScore = Math.min(100, overlapScore + compBonus + activityBonus + proximityBonus);

    // Filter out candidates with no meaningful connection
    if (totalScore < 15 && sharedSkills.length === 0 && !complementaryStrengths) {
      continue;
    }

    // Classify into confidence tiers
    let matchTier = 'Possible match';
    let confidence = 'low';
    if (totalScore >= 65 || (sharedSkills.length >= 2 && compBonus > 0)) {
      matchTier = 'Strong match';
      confidence = 'high';
    } else if (totalScore >= 35 || sharedSkills.length >= 1) {
      matchTier = 'Good match';
      confidence = 'medium';
    }

    // Potential collaboration domain
    let potentialCollaboration = 'Open-source developer tooling';
    if (sharedSkills.includes('react') || sharedSkills.includes('firebase')) {
      potentialCollaboration = 'Real-time collaborative applications';
    } else if (sharedSkills.includes('python') || currentDomain.isAI || candDomain.isAI) {
      potentialCollaboration = 'AI-assisted developer workflows';
    } else if (sharedSkills.includes('node') || sharedSkills.includes('go')) {
      potentialCollaboration = 'High-throughput microservices and APIs';
    }

    // Match explanation
    let matchReason = '';
    if (sharedSkills.length > 0 && complementaryStrengths) {
      matchReason = `Shared background in ${sharedSkills.slice(0, 3).join(', ')}. Complementary strengths in ${candDomain.isFrontend ? 'frontend UI' : candDomain.isBackend ? 'backend APIs' : 'systems'}.`;
    } else if (sharedSkills.length > 0) {
      matchReason = `Both actively work with ${sharedSkills.slice(0, 3).join(', ')}.`;
    } else if (complementaryStrengths) {
      matchReason = complementaryStrengths;
    } else {
      matchReason = 'Compatible developer skillset and tech stack.';
    }

    results.push({
      userId: candidate.id,
      username: candidate.username || 'Developer',
      matchTier,
      confidence,
      sharedSkills: sharedSkills.slice(0, 4),
      complementaryStrengths: complementaryStrengths || undefined,
      potentialCollaboration,
      matchReason,
      internalScore: totalScore,
    });
  }

  results.sort((a, b) => b.internalScore - a.internalScore);
  return results.slice(0, 6).map(({ internalScore, ...rest }) => rest);
}

/**
 * Fetch and enhance developer matches via Discuss Orchestrator with local fallback
 */
export async function getEnhancedDeveloperMatches(currentUser, candidateUsers = [], options = {}) {
  const localRanked = computeWeightedDeveloperMatches(currentUser, candidateUsers, options);
  if (localRanked.length === 0) return [];

  try {
    const aiResult = await executeAiAction(
      'match_developers',
      {
        currentUser: {
          id: currentUser.id,
          username: currentUser.username,
          talentGraph: currentUser.talentGraph,
          skills: currentUser.skills,
          bio: currentUser.bio,
        },
        candidateUsers: candidateUsers
          .filter((u) => localRanked.some((m) => m.userId === u.id))
          .map((u) => ({
            id: u.id,
            username: u.username,
            talentGraph: u.talentGraph,
            skills: u.skills,
            bio: u.bio,
          })),
      },
      { requiresAuth: true, dedupeKey: `matches-${currentUser.id}` }
    );

    if (Array.isArray(aiResult) && aiResult.length > 0) {
      return localRanked.map((loc) => {
        const enhanced = aiResult.find((a) => a.userId === loc.userId);
        if (!enhanced) return loc;
        return {
          ...loc,
          matchTier: enhanced.matchTier || loc.matchTier,
          confidence: enhanced.confidence || loc.confidence,
          sharedSkills: enhanced.sharedSkills || loc.sharedSkills,
          complementaryStrengths: enhanced.complementaryStrengths || loc.complementaryStrengths,
          potentialCollaboration: enhanced.potentialCollaboration || loc.potentialCollaboration,
          matchReason: enhanced.matchReason || loc.matchReason,
        };
      });
    }
  } catch (err) {
    console.warn('[TalentGraph] Orchestrator matching failed, using local ranking:', err.message);
  }

  return localRanked;
}
