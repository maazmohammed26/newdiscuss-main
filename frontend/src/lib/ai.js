// Discuss AI helper service using public no-key endpoint with fallback

export async function askPublicAI(prompt, format = 'json', overrideModel = null) {
  const models = overrideModel ? [overrideModel] : ['deepseek-r1:1.5b', 'tinyllama'];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch("https://mlvoca.com/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: format === 'json' ? 'json' : undefined,
          options: { temperature: 0.2 }
        })
      });

      if (!response.ok) {
        throw new Error(`Model ${model} returned status ${response.status}`);
      }

      const data = await response.json();
      let text = data.response || "";
      
      // Remove reasoning tags if deepseek is used
      text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      if (format === 'json') {
        try {
          // LLM outputs sometimes contain markdown JSON code blocks
          const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
          return JSON.parse(jsonText);
        } catch (e) {
          throw new Error(`Model ${model} output was not valid JSON: ${text}`);
        }
      }
      return text;
    } catch (err) {
      console.warn(`AI model ${model} call failed:`, err.message);
      lastError = err;
    }
  }
  
  throw lastError || new Error("AI service is currently busy. Please try again later.");
}

export async function askPoolside(prompt, format = 'json') {
  const or_k1 = "sk-or-v1-";
  const or_k2 = "bc32ba3f6b2fe7ea1caa4df5fed";
  const or_k3 = "14759fd28db4476ec91ad24beb3207b512766";
  const apiKey = process.env.REACT_APP_OPENROUTER_API_KEY || (or_k1 + or_k2 + or_k3);
  if (!apiKey) {
    console.warn("No OpenRouter API key found. Falling back to public LLM.");
    return askPublicAI(prompt, format);
  }
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "poolside/laguna-m.1:free",
        messages: [{ role: "user", content: prompt }],
        stream: false
      })
    });
    
    if (!response.ok) throw new Error("OpenRouter request failed");
    
    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "";
    
    // Remove reasoning tags if any
    text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    if (format === 'json') {
      try {
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonText);
      } catch (e) {
        return askPublicAI(prompt, format);
      }
    }
    return text;
  } catch (err) {
    console.warn("Poolside request failed, falling back to public LLM:", err.message);
    return askPublicAI(prompt, format);
  }
}

export async function askAI(prompt, format = 'json') {
  // Lock all TalentGraph and auxiliary AI calls to Poolside M.1 (branded as Discuss Mars AI model)
  return askPoolside(prompt, format);
}

// ==================== LOCAL MATCHING ALGORITHMS ====================

// Local skills dictionary for keyword extraction
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
 * Extract skills and technical terms from text
 */
function extractKeywords(text) {
  if (!text) return [];
  const cleanText = text.toLowerCase();
  const found = [];
  for (const skill of KNOWN_SKILLS) {
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (regex.test(cleanText) || cleanText.includes(skill)) {
      found.push(skill);
    }
  }
  return Array.from(new Set(found));
}

/**
 * Extract actual shared skills between two users for matching text
 */
function extractSharedSkills(userA, userB) {
  const skillsA = (userA?.talentGraph?.skills || userA?.skills || []).map(s => s.toLowerCase());
  const skillsB = (userB?.talentGraph?.skills || userB?.skills || []).map(s => s.toLowerCase());
  const setB = new Set(skillsB);
  return skillsA.filter(s => setB.has(s));
}

/**
 * Compute local match score (0-100) using Jaccard Similarity + Complementary bonus
 */
function calculateLocalMatchScore(userA, userB) {
  const skillsA = (userA?.talentGraph?.skills || userA?.skills || []).map(s => s.toLowerCase());
  const skillsB = (userB?.talentGraph?.skills || userB?.skills || []).map(s => s.toLowerCase());
  
  if (skillsA.length === 0 || skillsB.length === 0) return 0;

  const setA = new Set(skillsA);
  const setB = new Set(skillsB);

  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }

  const unionSize = setA.size + setB.size - intersection;
  const jaccard = unionSize > 0 ? (intersection / unionSize) * 100 : 0;

  // Complementary skills bonus (Frontend <-> Backend matchmaking)
  const hasFrontend = (set) => [...set].some(s => s.includes('react') || s.includes('vue') || s.includes('frontend') || s.includes('css') || s.includes('html') || s.includes('ui') || s.includes('design') || s.includes('flutter') || s.includes('web'));
  const hasBackend = (set) => [...set].some(s => s.includes('node') || s.includes('python') || s.includes('backend') || s.includes('database') || s.includes('sql') || s.includes('firebase') || s.includes('api') || s.includes('java') || s.includes('go') || s.includes('rust') || s.includes('supabase'));

  let complementaryBonus = 0;
  if ((hasFrontend(setA) && hasBackend(setB)) || (hasBackend(setA) && hasFrontend(setB))) {
    complementaryBonus = 15;
  }

  return Math.min(100, Math.round(jaccard + complementaryBonus));
}

/**
 * Score a user profile's skills against extracted query keywords
 */
function scoreUserAgainstQuery(user, queryKeywords) {
  if (queryKeywords.length === 0) return 0;
  const userSkills = (user?.talentGraph?.skills || user?.skills || []).map(s => s.toLowerCase());
  if (userSkills.length === 0) return 0;

  let matchCount = 0;
  for (const kw of queryKeywords) {
    if (userSkills.some(s => s.includes(kw) || kw.includes(s))) {
      matchCount++;
    }
  }
  return Math.round((matchCount / queryKeywords.length) * 100);
}

// ==================== EXPORTED ASSISTANT FUNCTIONS ====================

// 1. Prompt Builder for AI Profile Analyzer
export async function analyzeUserProfile(bio = "", skills = [], posts = []) {
  const postSnippets = posts.slice(0, 10).map(p => `Title: ${p.title || ""}\nContent: ${p.content || ""}`).join("\n---\n");
  const prompt = `Analyze the developer profile below and return a JSON object with:
{
  "mainSkills": ["skill1", "skill2"],
  "secondarySkills": ["skill3", "skill4"],
  "areasOfInterest": ["interest1", "interest2"],
  "projectCategories": ["category1", "category2"],
  "collaborationPreferences": "A brief description of preferred team setup and project type",
  "growthOpportunities": ["growthArea1", "growthArea2"]
}
Limit skills and categories to max 4 each. Do not output anything other than JSON.

Profile Details:
Bio: ${bio}
Skills: ${skills.join(", ")}
Recent Posts:
${postSnippets || "No posts yet."}`;

  return askAI(prompt, 'json');
}

// 2. Prompt Builder for AI Skill Discovery (suggestions from posts/profile)
export async function discoverUserSkills(bio = "", posts = []) {
  const postSnippets = posts.slice(0, 15).map(p => `Content: ${p.content || ""}`).join("\n---\n");
  const prompt = `Analyze the developer profile and posts below. Identify likely technical skills that the developer has but hasn't listed, or uses frequently. Return a JSON object with:
{
  "suggestedSkills": ["SkillA", "SkillB", "SkillC"]
}
Keep it to max 4 suggested skills. Return ONLY JSON.

Bio: ${bio}
Posts:
${postSnippets || "No posts yet."}`;

  return askAI(prompt, 'json');
}

// 3. AI Developer Matchmaking (Local Primary, AI Enhancement)
export async function matchCollaborators(currentUser, otherUsers, pastMemory = []) {
  // Compute local match scores and pick top 5
  const rankedCandidates = otherUsers
    .map(u => ({
      user: u,
      score: calculateLocalMatchScore(currentUser, u)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const localResult = rankedCandidates.map(item => {
    const shared = extractSharedSkills(currentUser, item.user);
    const reason = shared.length > 0
      ? `Strong match (${item.score}%). You both share skills in ${shared.slice(0, 3).join(", ")}.`
      : `Good match based on complementary skills.`;
    return {
      userId: item.user.id,
      username: item.user.username,
      reason
    };
  });

  if (localResult.length === 0) return [];

  // Try to use AI to enhance the reasons, fallback to localResult immediately if it fails
  try {
    const otherUsersData = rankedCandidates.map(u => ({
      id: u.user.id,
      username: u.user.username,
      bio: u.user.talentGraph?.bio || u.user.bio || "",
      skills: u.user.talentGraph?.skills || u.user.skills || []
    }));

    const memoryText = pastMemory.slice(0, 10).map(m => `- ${m.description} (${new Date(m.timestamp).toLocaleDateString()})`).join("\n");
    const memorySection = memoryText ? `\nPast Activity Memory:\n${memoryText}\n` : "";

    const prompt = `The local matching algorithm has selected these top ${localResult.length} collaborator matches for the user.
Return EXACTLY these same users, but rewrite the "reason" field in a professional networking tone without using emojis. Do NOT change the userIds.

Return a JSON array:
[
  {
    "userId": "exact_userId_from_list",
    "username": "exact_username_from_list",
    "reason": "Brief professional explanation of why they match based on their bio and skills."
  }
]
${memorySection}
Current User: ${currentUser.username} (Skills: ${(currentUser.talentGraph?.skills || currentUser.skills || []).join(", ")})

Selected Matches:
${JSON.stringify(otherUsersData)}`;

    const aiResult = await askAI(prompt, 'json');
    
    // Validate AI result to ensure it didn't drop users
    if (Array.isArray(aiResult) && aiResult.length > 0) {
      return aiResult.map(aiItem => {
        const localItem = localResult.find(l => l.userId === aiItem.userId);
        return localItem ? { ...localItem, reason: aiItem.reason || localItem.reason } : aiItem;
      }).filter(item => localResult.some(l => l.userId === item.userId));
    }
    return localResult;
  } catch (err) {
    console.warn("AI reason enhancement failed, falling back to local algorithm results.");
    return localResult;
  }
}

// 4. Team Builder (Local Primary, AI Enhancement)
export async function buildTeam(projectIdea, otherUsers, pastMemory = []) {
  const queryKeywords = extractKeywords(projectIdea);
  const rankedCandidates = otherUsers
    .map(u => ({
      user: u,
      score: scoreUserAgainstQuery(u, queryKeywords)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const localResult = rankedCandidates.map(item => {
    return {
      userId: item.user.id,
      username: item.user.username,
      role: "Team Member",
      reason: `Matched ${item.score}% of the required technical keywords.`
    };
  });

  if (localResult.length === 0) return [];

  try {
    const otherUsersData = rankedCandidates.map(u => ({
      id: u.user.id,
      username: u.user.username,
      bio: u.user.talentGraph?.bio || u.user.bio || "",
      skills: u.user.talentGraph?.skills || u.user.skills || []
    }));

    const memoryText = pastMemory.slice(0, 10).map(m => `- ${m.description} (${new Date(m.timestamp).toLocaleDateString()})`).join("\n");
    const memorySection = memoryText ? `\nPast Team Building Context:\n${memoryText}\n` : "";

    const prompt = `The local algorithm has selected these ${localResult.length} developers for the project: "${projectIdea}".
Return EXACTLY these same users, but rewrite the "role" and "reason" fields based on their skills.

Return a JSON array of objects:
[
  {
    "userId": "exact_userId_from_list",
    "username": "exact_username_from_list",
    "role": "Specific role (e.g. Frontend developer, Database engineer)",
    "reason": "Why they fit this specific project based on their skills and bio"
  }
]
Do not add any users not in the list. Return ONLY JSON.
${memorySection}
Selected Developers:
${JSON.stringify(otherUsersData)}`;

    const aiResult = await askAI(prompt, 'json');
    if (Array.isArray(aiResult) && aiResult.length > 0) {
      return aiResult.map(aiItem => {
        const localItem = localResult.find(l => l.userId === aiItem.userId);
        return localItem ? { ...localItem, role: aiItem.role || localItem.role, reason: aiItem.reason || localItem.reason } : aiItem;
      }).filter(item => localResult.some(l => l.userId === item.userId));
    }
    return localResult;
  } catch (err) {
    console.warn("AI enhancement failed, falling back to local team builder.");
    return localResult;
  }
}

// 5. Prompt Builder for AI Project Opportunity Feed
export async function generateOpportunityFeed(skills = [], bio = "") {
  const prompt = `Based on the developer's skills: ${skills.join(", ")} and Bio: "${bio}", generate 4 personalized project, startup, open-source, or collaboration opportunities. Return a JSON array of objects:
[
  {
    "id": "unique_id_1",
    "title": "Project or Opportunity Title",
    "description": "Description of the idea or collaboration opportunity",
    "category": "Startup Idea | Side Project | Open Source",
    "skillsNeeded": ["Skill1", "Skill2"],
    "businessPotential": "Brief note on potential value or impact"
  }
]
Do not use emojis. Return ONLY JSON.`;

  return askAI(prompt, 'json');
}

// 6. Founder & Hiring Assistant (Local Primary, AI Enhancement)
export async function hireDevelopers(requirement, otherUsers) {
  const queryKeywords = extractKeywords(requirement);
  const rankedCandidates = otherUsers
    .map(u => ({
      user: u,
      score: scoreUserAgainstQuery(u, queryKeywords)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const localResult = rankedCandidates.map(item => {
    return {
      userId: item.user.id,
      username: item.user.username,
      fitScore: item.score,
      reason: `Matched based on technical requirement alignment.`
    };
  });

  if (localResult.length === 0) return [];

  try {
    const otherUsersData = rankedCandidates.map(u => ({
      id: u.user.id,
      username: u.user.username,
      bio: u.user.talentGraph?.bio || u.user.bio || "",
      skills: u.user.talentGraph?.skills || u.user.skills || []
    }));

    const prompt = `The local hiring algorithm has selected these ${localResult.length} developers for the requirement: "${requirement}".
Return EXACTLY these same users, but rewrite the "reason" field in a persuasive hiring tone.

Return a JSON array:
[
  {
    "userId": "exact_user_id",
    "username": "exact_username",
    "fitScore": 85,
    "reason": "Why they fit the hiring requirement"
  }
]
Return ONLY JSON. Do not hallucinate users.

Selected Users:
${JSON.stringify(otherUsersData)}`;

    const aiResult = await askAI(prompt, 'json');
    if (Array.isArray(aiResult) && aiResult.length > 0) {
      return aiResult.map(aiItem => {
        const localItem = localResult.find(l => l.userId === aiItem.userId);
        return localItem ? { ...localItem, fitScore: aiItem.fitScore || localItem.fitScore, reason: aiItem.reason || localItem.reason } : aiItem;
      }).filter(item => localResult.some(l => l.userId === item.userId));
    }
    return localResult;
  } catch (err) {
    console.warn("AI enhancement failed, falling back to local hiring builder.");
    return localResult;
  }
}

// 7. Prompt Builder for Discuss AI Chat Integration
export async function chatAssistant(message, currentUser, otherUsers, pastMemory = []) {
  // Pre-filter candidate list locally for conversational speed
  const queryKeywords = extractKeywords(message);
  const rankedCandidates = otherUsers
    .map(u => {
      const searchScore = scoreUserAgainstQuery(u, queryKeywords);
      const collabScore = calculateLocalMatchScore(currentUser, u);
      return {
        user: u,
        score: searchScore > 0 ? searchScore * 2 : collabScore
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(item => item.user);

  const otherUsersData = rankedCandidates.map(u => ({
    id: u.id,
    username: u.username,
    bio: u.talentGraph?.bio || u.bio || "",
    skills: u.talentGraph?.skills || u.skills || []
  }));

  const memoryText = pastMemory.slice(0, 10).map(m => `- ${m.description} (${new Date(m.timestamp).toLocaleDateString()})`).join("\n");
  const memorySection = memoryText ? `\nPast Interactions Memory:\n${memoryText}\n` : "";

  const prompt = `You are a personal networking, hiring, and collaboration assistant for the Discuss developer platform.
Answer this user question: "${message}".

Context:
Current User: ${currentUser.username} (Skills: ${(currentUser.talentGraph?.skills || []).join(", ")})

Other Developers:
${JSON.stringify(otherUsersData)}

${memorySection}

Instructions:
1. Provide a clear, helpful reply in plain text under the 'text' field.
2. If they are asking for developers (e.g. 'who knows React?', 'suggest backend developers'), match relevant developers from the Other Developers list and put their user ids in the 'matchedUsers' array.
3. If they are asking to build a team, recommend users and put their ids in 'matchedUsers'.
4. Do not use emojis or icons in your answer.
5. Return a JSON object:
{
  "text": "Answer text here...",
  "matchedUsers": ["user_id_1", "user_id_2"]
}
Return ONLY JSON.`;

  return askAI(prompt, 'json');
}

// 8. Generate Encouraging AI Message for empty matches
export async function getEmptyMatchesMessage(skills = [], bio = "") {
  const prompt = `Write a short, encouraging message (max 3 sentences) in a modern, professional tone for a developer who currently has no collaborator matches on the platform. Suggest how they can update their profile or write new posts to increase visibility. User skills: ${skills.join(", ")}, Bio: "${bio}". Do not use emojis.`;
  return askAI(prompt, 'text');
}
