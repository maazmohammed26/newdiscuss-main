import { getAuthenticatedIdToken } from './authenticatedRequest';

const getAiEndpointUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('discussit.in')) {
      return '/api/ai';
    }
    return 'https://discussit.in/api/ai';
  }
  return '/api/ai';
};

// In-flight request deduplication map
const pendingRequests = new Map();

/**
 * Perform a centralized Discuss Intelligence request
 */
export async function executeAiAction(action, payload = {}, options = {}) {
  const { requiresAuth = false, dedupeKey = null, signal = null, timeoutMs = null } = options;

  // Check if identical request is in flight
  if (dedupeKey && pendingRequests.has(dedupeKey)) {
    return pendingRequests.get(dedupeKey);
  }

  const promise = (async () => {
    const controller = new AbortController();
    let timeoutTimer = null;

    if (timeoutMs && Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        controller.abort(new DOMException('Request timeout', 'TimeoutError'));
      }, timeoutMs);
    }

    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
      }
    }

    try {
      const headers = { 'Content-Type': 'application/json' };

      if (requiresAuth) {
        try {
          const token = await getAuthenticatedIdToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch (err) {
          if (requiresAuth) throw err;
        }
      } else {
        // Attempt token inclusion if available without blocking
        try {
          const token = await getAuthenticatedIdToken({ timeoutMs: 1000 }).catch(() => null);
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch (_) {}
      }

      const response = await fetch(getAiEndpointUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, payload }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI service responded with HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        return {
          unavailable: true,
          message: result.message || 'Discuss Intelligence is temporarily unavailable.',
        };
      }

      return result.data;
    } catch (err) {
      const isAborted = controller.signal.aborted || err.name === 'AbortError' || err.name === 'TimeoutError';
      if (!isAborted) {
        console.warn(`[Discuss Intelligence] Action '${action}' network error:`, err.message);
      }
      return {
        unavailable: true,
        aborted: isAborted,
        message: isAborted ? 'Request cancelled' : 'Discuss Intelligence is temporarily unavailable.',
      };
    } finally {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (dedupeKey) {
        pendingRequests.delete(dedupeKey);
      }
    }
  })();

  if (dedupeKey) {
    pendingRequests.set(dedupeKey, promise);
  }

  return promise;
}
