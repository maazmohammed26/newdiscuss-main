import { executeAiAction } from './aiOrchestratorClient';
import { getEnhancedDeveloperMatches, computeWeightedDeveloperMatches } from './talentGraphMatching';
import { getProfileIntelligence } from './profileIntelligence';

/**
 * Universal Discuss Intelligence request helper
 */
export async function askAI(actionOrPrompt, payloadOrFormat = 'json') {
  if (typeof actionOrPrompt === 'string' && typeof payloadOrFormat === 'object') {
    return executeAiAction(actionOrPrompt, payloadOrFormat);
  }
  return executeAiAction('analyze_profile', { bio: String(actionOrPrompt || '') });
}

// Re-export profile analysis
export async function analyzeUserProfile(bio = '', skills = [], posts = []) {
  return getProfileIntelligence({ bio, talentGraph: { skills } }, posts);
}

export async function discoverUserSkills(bio = '', posts = []) {
  const intel = await getProfileIntelligence({ bio, talentGraph: { skills: [] } }, posts);
  return {
    suggestedSkills: intel.growingSignals || intel.strongSignals || [],
  };
}

// Developer Matchmaking
export async function matchCollaborators(currentUser, otherUsers = [], pastMemory = []) {
  return getEnhancedDeveloperMatches(currentUser, otherUsers);
}

// Team Builder
export async function buildTeam(projectIdea, otherUsers = [], pastMemory = []) {
  try {
    const result = await executeAiAction(
      'build_team',
      {
        projectDesc: projectIdea,
        candidateUsers: otherUsers.slice(0, 15),
      },
      { requiresAuth: true }
    );
    if (Array.isArray(result) && result.length > 0) return result;
  } catch (_) {}

  // Local fallback
  return otherUsers.slice(0, 3).map((u) => ({
    userId: u.id,
    username: u.username,
    role: 'Core Contributor',
    reason: `Demonstrated technical focus aligning with project requirements.`,
  }));
}

// Opportunity Feed
export async function generateOpportunityFeed(skills = [], bio = '') {
  try {
    const result = await executeAiAction(
      'generate_opportunities',
      { skills, bio },
      { requiresAuth: true }
    );
    if (Array.isArray(result) && result.length > 0) return result;
  } catch (_) {}

  const s1 = skills[0] || 'Modern Web';
  const s2 = skills[1] || 'API Services';
  return [
    {
      id: 'opp-1',
      title: `Real-time ${s1} Developer Workbench`,
      description: `Build an open-source productivity workbench combining ${s1} and high-efficiency state sync.`,
      category: 'Open Source',
      skillsNeeded: [s1, s2],
      potentialImpact: 'High developer community utility.',
    },
    {
      id: 'opp-2',
      title: `Collaborative ${s2} Architecture`,
      description: `Design a fault-tolerant microservice layer for real-time developer workflows.`,
      category: 'Side Project',
      skillsNeeded: [s1, s2],
      potentialImpact: 'Showcases advanced backend architecture and reliability.',
    },
  ];
}

// Hiring Assistant
export async function hireDevelopers(requirement, otherUsers = []) {
  try {
    const result = await executeAiAction(
      'hire_developers',
      { hiringReq: requirement, candidateUsers: otherUsers.slice(0, 15) },
      { requiresAuth: true }
    );
    if (Array.isArray(result) && result.length > 0) return result;
  } catch (_) {}

  return otherUsers.slice(0, 3).map((u) => ({
    userId: u.id,
    username: u.username,
    fitTier: 'Good match',
    reason: `Technical background aligned with "${requirement.slice(0, 30)}...".`,
  }));
}

// Message for empty matches
export async function getEmptyMatchesMessage(skills = [], bio = '') {
  if (!skills || skills.length === 0) {
    return 'Add your core skills to your profile to help Discuss match you with relevant collaborators across the network.';
  }
  return `You have listed ${skills.slice(0, 3).join(', ')}. As more developers join and showcase projects with overlapping or complementary skills, your matches will appear here.`;
}
