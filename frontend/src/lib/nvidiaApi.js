import { getAuthenticatedIdToken } from './authenticatedRequest';
import { evaluatePostSafety } from './safetyService';

const getGeminiProxyUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('discussit.in')) {
      return '/api/gemini';
    }
    return 'https://discussit.in/api/gemini';
  }
  return '/api/gemini';
};

const GEMINI_PROXY = getGeminiProxyUrl();

/**
 * Chat with Discuss AI Assistant (retained for backend internal compatibility)
 */
export async function chatWithAI(messages) {
  try {
    const systemMsg = messages.find((m) => m.role === 'system');
    const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));

    const token = await getAuthenticatedIdToken();
    const response = await fetch(GEMINI_PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        systemInstruction,
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      const errText = await response.text().catch(() => '');
      throw new Error(`AI Error: ${response.status}${errText ? ' — ' + errText.slice(0, 150) : ''}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('No response from AI API');
  } catch (error) {
    console.error('Error in chatWithAI:', error);
    throw error;
  }
}

/**
 * Check content safety using Discuss Centralized Safety Intelligence
 */
export const checkContentSafety = async (text, code = '') => {
  if (!text || text.trim().length < 2) return null;
  return evaluatePostSafety(text, code);
};
