import { getAuthenticatedIdToken } from './authenticatedRequest';
import { sendRemoteNotification } from './notificationTransport';

jest.mock('./authenticatedRequest', () => ({
  getAuthenticatedIdToken: jest.fn(),
}));

describe('notificationTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('starts an authenticated keepalive request without loading the SDK module', async () => {
    getAuthenticatedIdToken.mockResolvedValue('token-1');
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, id: 'notification-1' }),
    });

    await expect(sendRemoteNotification('recipient_123', 'Hello', 'Body', { type: 'chat' })).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/send-notification', expect.objectContaining({
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
    }));
  });

  it('refreshes the Firebase token once after a 401 and preserves the event id', async () => {
    getAuthenticatedIdToken.mockResolvedValueOnce('stale-token').mockResolvedValueOnce('fresh-token');
    fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ code: 'unauthenticated' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await expect(sendRemoteNotification('recipient_123', 'Hello', 'Body')).resolves.toBe(true);

    const firstBody = JSON.parse(fetch.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(secondBody.eventId).toBe(firstBody.eventId);
    expect(getAuthenticatedIdToken).toHaveBeenLastCalledWith({ forceRefresh: true });
  });

  it('does not call the API when Firebase auth restoration fails', async () => {
    getAuthenticatedIdToken.mockRejectedValue(Object.assign(new Error('not restored'), { code: 'auth-session-unavailable' }));

    await expect(sendRemoteNotification('recipient_123', 'Hello', 'Body')).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retries a transient server failure once with the same event id', async () => {
    getAuthenticatedIdToken.mockResolvedValue('token-1');
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: 'temporarily-unavailable' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await expect(sendRemoteNotification('recipient_123', 'Hello', 'Body')).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetch.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(secondBody.eventId).toBe(firstBody.eventId);
  });
});
