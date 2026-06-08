// sherlockAi.js - AI Summary integration using mlvoca.com

export async function askPublicAI(prompt, model = "tinyllama") {
  try {
    const response = await fetch("https://mlvoca.com/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.2 }
      })
    });

    if (!response.ok) {
      throw new Error("Public AI is busy. Try again later.");
    }

    const data = await response.json();
    return data.response || "";
  } catch (error) {
    console.error("askPublicAI Error:", error);
    throw error;
  }
}

export const generateAiSummary = async (username, foundPlatforms) => {
  if (!foundPlatforms || foundPlatforms.length === 0) {
    return {
      summary: "No accounts found for this username.",
      score: "Low",
      type: "Unknown"
    };
  }

  const platformNames = foundPlatforms.map(p => p.platform).join(", ");
  
  const prompt = `Analyze the digital footprint of the username "${username}". It was found on these platforms: ${platformNames}.
Respond ONLY with a JSON object exactly matching this format, with no extra text:
{
  "summary": "A short 1-2 sentence analysis of their footprint.",
  "score": "Low, Medium, or High",
  "type": "e.g., Developer Presence, Creator Presence, etc."
}`;

  try {
    // We try to get AI summary but use rule-based fallback if it fails or times out
    // Using deepseek for better reasoning if available, or tinyllama for speed.
    const rawResponse = await askPublicAI(prompt, "tinyllama");
    let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.warn("AI Summary generation failed, falling back to rule-based engine.");
    return generateRuleBasedSummary(username, foundPlatforms);
  }
};

export const generateRuleBasedSummary = (username, foundPlatforms) => {
  const categories = foundPlatforms.map(p => p.category);
  const isDev = categories.includes('Developer');
  const isSocial = categories.includes('Social Media');
  const isGamer = categories.includes('Gaming');
  const isStreamer = categories.includes('Streaming');

  let type = "General Web Presence";
  if (isDev && isSocial) type = "Active Developer & Social Presence";
  else if (isDev) type = "Developer Presence";
  else if (isStreamer || isGamer) type = "Creator/Gamer Presence";
  else if (categories.includes('Professional')) type = "Professional Presence";

  let score = "Low";
  if (foundPlatforms.length > 5) score = "Medium";
  if (foundPlatforms.length > 10) score = "High";

  return {
    summary: `This username appears on ${foundPlatforms.length} platforms, highlighting a distinct ${type.toLowerCase()} across the web.`,
    score,
    type
  };
};
