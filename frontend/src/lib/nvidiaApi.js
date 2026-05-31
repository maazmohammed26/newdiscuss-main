// We've switched to Google Gemini API but kept the file name for backwards compatibility
const getGeminiProxyUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return "/api/gemini";
    }
    if (hostname.endsWith('discussit.in')) {
      return "/api/gemini";
    }
    return "https://discussit.in/api/gemini";
  }
  return "/api/gemini";
};

const GEMINI_PROXY = getGeminiProxyUrl();

/**
 * Chat with Discuss AI Assistant using Gemini
 * Supports dynamic model selection via the model param
 */
export async function chatWithAI(messages, model = "gemini-1.5-flash") {
  try {
    // Convert OpenAI style messages to Gemini format
    const systemMsg = messages.find(m => m.role === 'system');
    const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;
    
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }]
      }));

    const response = await fetch(`${GEMINI_PROXY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-model": model,
      },
      body: JSON.stringify({
        systemInstruction,
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errText = await response.text().catch(() => "");
      throw new Error(`Gemini API Error: ${response.status}${errText ? " — " + errText.slice(0, 150) : ""}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("No response from Gemini API");
    }
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    if (error instanceof TypeError || error.message?.includes('Failed to fetch')) {
      throw new Error("NETWORK_DISCONNECTED: Could not reach the AI network. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Check content safety using Gemini (returns raw factors for scoring logic)
 */
export async function checkContentSafety(text) {
  try {
    const contents = [
      {
        role: "user",
        parts: [{ text: `Analyze the following text for safety, toxicity, usefulness, and quality.
Support English, Hindi, Hinglish, and mixed-language posts written in English letters.
Detect slang, bad words, misspellings, symbol-masked words, and repeated characters.

Respond ONLY with a JSON object in exactly this format containing float values from 0.0 to 1.0:
{
  "toxicityScore": 0.0,
  "hateSpeechScore": 0.0,
  "profanityScore": 0.0,
  "spamScore": 0.0,
  "usefulnessScore": 0.0,
  "qualityScore": 0.0,
  "threatScore": 0.0,
  "reasoning": "A short explanation of your analysis."
}

Text to analyze:
"${text.replace(/"/g, '\\"')}"` }]
      }
    ];

    const response = await fetch(`${GEMINI_PROXY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gemini-model": "gemini-1.5-flash",
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        }
      }),
    });

    if (!response.ok) {
      return null; // Fail open
    }

    const data = await response.json();
    if (!data.candidates) return null;
    
    const content = data.candidates[0].content.parts[0].text;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return {
        toxicityScore: parseFloat(parsed.toxicityScore) || 0,
        hateSpeechScore: parseFloat(parsed.hateSpeechScore) || 0,
        profanityScore: parseFloat(parsed.profanityScore) || 0,
        spamScore: parseFloat(parsed.spamScore) || 0,
        usefulnessScore: parseFloat(parsed.usefulnessScore) || 0,
        qualityScore: parseFloat(parsed.qualityScore) || 0,
        threatScore: parseFloat(parsed.threatScore) || 0,
        reasoning: parsed.reasoning || "Analyzed by Gemini AI."
      };
    } catch (e) {
      return null; // Force fallback if parsing fails
    }
  } catch (error) {
    console.error("Error in checkContentSafety:", error);
    return null; // Fail open
  }
}
