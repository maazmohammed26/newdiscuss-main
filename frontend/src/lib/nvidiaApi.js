const AI_ASSISTANT_API_KEY = process.env.REACT_APP_NVIDIA_AI_ASSISTANT_KEY;
const AI_ASSISTANT_MODEL = "stepfun-ai/step-3.7-flash";

const CONTENT_SAFETY_API_KEY = process.env.REACT_APP_NVIDIA_NEMOTRON_KEY;
const CONTENT_SAFETY_MODEL = "meta/nemotron-3-8b-content-safety";

// Dynamic API base detection — handles local development, production web, 
// and hybrid mobile app WebView contexts (e.g. Median.co/GoNative, Cordova, Capacitor)
const getNvidiaProxyUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // If local dev environment, use relative path so craco setupProxy.js intercepts it
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return "/api/nvidia";
    }
    // If running on production website, use standard relative path
    if (hostname.endsWith('discussit.in')) {
      return "/api/nvidia";
    }
    // Fallback: If inside native mobile webview wrapper (loads via file:// or custom local schemas),
    // route directly to the secure production serverless proxy endpoint
    return "https://discussit.in/api/nvidia";
  }
  return "/api/nvidia";
};

const NVIDIA_PROXY = getNvidiaProxyUrl();

/**
 * Chat with Discuss AI Assistant
 */
export async function chatWithAI(messages) {
  try {
    const response = await fetch(`${NVIDIA_PROXY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_ASSISTANT_API_KEY}`,
        // Also pass as custom header so the Vercel serverless fn can forward it
        "x-api-key": AI_ASSISTANT_API_KEY,
      },
      body: JSON.stringify({
        model: AI_ASSISTANT_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      const errText = await response.text().catch(() => "");
      throw new Error(`NVIDIA API Error: ${response.status}${errText ? " — " + errText.slice(0, 120) : ""}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    // Robust exception mapping for webviews and offline network disconnects
    if (error instanceof TypeError || error.message?.includes('Failed to fetch')) {
      throw new Error("NETWORK_DISCONNECTED: Could not reach the AI network. Please check your internet connection.");
    }
    throw error;
  }
}

/**
 * Check content safety using Nemotron-3
 */
export async function checkContentSafety(text) {
  try {
    const response = await fetch(`${NVIDIA_PROXY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONTENT_SAFETY_API_KEY}`,
        "x-api-key": CONTENT_SAFETY_API_KEY,
      },
      body: JSON.stringify({
        model: CONTENT_SAFETY_MODEL,
        messages: [
          {
            role: "user",
            content: `Analyze the following text for safety, toxicity, and usefulness.
Respond ONLY with a JSON object in exactly this format:
{
  "score": "Green" | "Yellow" | "Red",
  "reasoning": "A short explanation of why it received this score"
}
Rules for scoring:
- Green: Fully useful content, educational, standard discussion.
- Yellow: Non-educational, unnecessary, spammy, or slightly off-topic.
- Red: Hate speech, highly toxic, dangerous, or illegal content.

Text to analyze:
"${text.replace(/"/g, '\\"')}"`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      throw new Error(`NVIDIA Safety API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      return {
        score: parsed.score || "Green",
        reasoning: parsed.reasoning || "Checked automatically by Nemotron-3.",
      };
    } catch (e) {
      return {
        score: "Green",
        reasoning: "System default (AI response could not be parsed).",
      };
    }
  } catch (error) {
    console.error("Error in checkContentSafety:", error);
    return null; // Fail open
  }
}
