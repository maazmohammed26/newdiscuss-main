import { executeAiAction } from './aiOrchestratorClient';
import { extractSkillsFromText } from './talentGraphMatching';

/**
 * Derive profile intelligence separating explicit skills from inferred signals
 */
export async function getProfileIntelligence(profile = {}, posts = []) {
  const declaredSkills = profile.talentGraph?.skills || profile.skills || [];
  const bio = profile.talentGraph?.bio || profile.bio || '';

  // Extract skills demonstrated through published posts and projects
  const postSkills = new Set();
  for (const post of posts) {
    const text = `${post.title || ''} ${post.content || ''} ${post.code || ''}`;
    const found = extractSkillsFromText(text);
    found.forEach((s) => postSkills.add(s));
  }

  // Explicit skills that are also demonstrated in posts are "Strong signals"
  const strong = declaredSkills.filter((s) => postSkills.has(s.toLowerCase()));
  // Skills demonstrated in posts that aren't in declared skills are "Growing signals"
  const growing = Array.from(postSkills).filter((s) => !declaredSkills.map((d) => d.toLowerCase()).includes(s));

  // Default fallback intelligence
  const localIntelligence = {
    strongSignals: strong.length > 0 ? strong.slice(0, 4) : declaredSkills.slice(0, 3),
    growingSignals: growing.length > 0 ? growing.slice(0, 3) : [],
    collaborationStrengths: declaredSkills.length
      ? `Focused on ${declaredSkills.slice(0, 2).join(' and ')} application development.`
      : 'Engineering and technical community contribution.',
    discoverabilityTips:
      declaredSkills.length < 3
        ? ['Add 3 or more skills to your profile to improve collaborator recommendations.']
        : growing.length > 0
        ? [`You frequently mention ${growing[0]} in your posts. Consider adding it to your profile skills.`]
        : ['Share technical projects demonstrating your latest work to boost discoverability.'],
    analyzedAt: new Date().toISOString(),
  };

  try {
    const aiResult = await executeAiAction(
      'analyze_profile',
      {
        bio,
        skills: declaredSkills,
        posts: posts.slice(0, 5).map((p) => ({ title: p.title, content: p.content })),
      },
      { requiresAuth: true, dedupeKey: `intelligence-${profile.id}` }
    );

    if (aiResult && !aiResult.unavailable && aiResult.strongSignals) {
      return {
        strongSignals: aiResult.strongSignals.length ? aiResult.strongSignals : localIntelligence.strongSignals,
        growingSignals: aiResult.growingSignals.length ? aiResult.growingSignals : localIntelligence.growingSignals,
        collaborationStrengths: aiResult.collaborationStrengths || localIntelligence.collaborationStrengths,
        discoverabilityTips: aiResult.discoverabilityTips?.length ? aiResult.discoverabilityTips : localIntelligence.discoverabilityTips,
        analyzedAt: aiResult.analyzedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[ProfileIntelligence] Orchestrator call failed, using local extraction:', err.message);
  }

  return localIntelligence;
}
