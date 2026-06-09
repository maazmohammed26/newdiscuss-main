// Discuss AI helper service using public no-key endpoint with fallback

export async function askPublicAI(prompt, format = 'json') {
  const models = ['tinyllama', 'deepseek-r1:1.5b'];
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

  return askPublicAI(prompt, 'json');
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

  return askPublicAI(prompt, 'json');
}

// 3. Prompt Builder for AI Developer Matchmaking
export async function matchCollaborators(currentUser, otherUsers) {
  const otherUsersData = otherUsers.slice(0, 30).map(u => ({
    id: u.id,
    username: u.username,
    bio: u.talentGraph?.bio || u.bio || "",
    skills: u.talentGraph?.skills || u.skills || []
  }));

  const prompt = `Identify top 5 developer collaborator matches for the current user from the list of other users. Return a JSON array of objects:
[
  {
    "userId": "other_user_id",
    "username": "other_username",
    "reason": "Brief explanation of why they match (e.g. complementary skills, shared interest in AI)"
  }
]
Do not return users with no skills. Explain matches in a professional networking tone without using emojis. Return ONLY JSON.

Current User:
Username: ${currentUser.username}
Bio: ${currentUser.talentGraph?.bio || currentUser.bio || ""}
Skills: ${(currentUser.talentGraph?.skills || currentUser.skills || []).join(", ")}

Other Users:
${JSON.stringify(otherUsersData)}`;

  return askPublicAI(prompt, 'json');
}

// 4. Prompt Builder for AI Team Builder
export async function buildTeam(projectIdea, otherUsers) {
  const otherUsersData = otherUsers.slice(0, 30).map(u => ({
    id: u.id,
    username: u.username,
    bio: u.talentGraph?.bio || u.bio || "",
    skills: u.talentGraph?.skills || u.skills || []
  }));

  const prompt = `You are an AI team builder. Suggest up to 4 developers from the user list who would be perfect for this project: "${projectIdea}". Return a JSON array of objects:
[
  {
    "userId": "user_id",
    "username": "username",
    "role": "Proposed role (e.g. Frontend developer, Backend engineer)",
    "reason": "Why they fit this specific project based on their skills and bio"
  }
]
Recommend actual users from the list only. Return ONLY JSON.

Other Users:
${JSON.stringify(otherUsersData)}`;

  return askPublicAI(prompt, 'json');
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

  return askPublicAI(prompt, 'json');
}

// 6. Prompt Builder for AI Founder & Hiring Assistant
export async function hireDevelopers(requirement, otherUsers) {
  const otherUsersData = otherUsers.slice(0, 30).map(u => ({
    id: u.id,
    username: u.username,
    bio: u.talentGraph?.bio || u.bio || "",
    skills: u.talentGraph?.skills || u.skills || []
  }));

  const prompt = `You are a startup hiring assistant. Recommend up to 4 developers from the user list matching this requirement: "${requirement}". Return a JSON array:
[
  {
    "userId": "user_id",
    "username": "username",
    "fitScore": 85, // integer 0-100
    "reason": "Why they fit the hiring requirement"
  }
]
Return ONLY JSON.

Users:
${JSON.stringify(otherUsersData)}`;

  return askPublicAI(prompt, 'json');
}

// 7. Prompt Builder for Discuss AI Chat Integration
export async function chatAssistant(message, currentUser, otherUsers) {
  const otherUsersData = otherUsers.slice(0, 40).map(u => ({
    id: u.id,
    username: u.username,
    bio: u.talentGraph?.bio || u.bio || "",
    skills: u.talentGraph?.skills || u.skills || []
  }));

  const prompt = `You are a personal networking, hiring, and collaboration assistant for the Discuss developer platform.
Answer this user question: "${message}".

Context:
Current User: ${currentUser.username} (Skills: ${(currentUser.talentGraph?.skills || []).join(", ")})

Other Developers:
${JSON.stringify(otherUsersData)}

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

  return askPublicAI(prompt, 'json');
}
