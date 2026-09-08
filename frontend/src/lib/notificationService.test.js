import { emitNotificationEvent } from './notificationService';
import { getAuthenticatedIdToken } from './authenticatedRequest';

jest.mock('./authenticatedRequest', () => ({
  getAuthenticatedIdToken: jest.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    getAuthenticatedIdToken.mockResolvedValue('token-1');
  });

  it('deduplicates recipients and sends a typed authenticated event', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

    const result = await emitNotificationEvent({
      type: 'group_message',
      recipientId: 'user-a',
      recipientIds: ['user-a', 'user-b'],
      entityId: 'group-1',
      eventId: 'operation-1',
    });

    expect(result).toEqual(expect.objectContaining({ ok: true, eventId: 'operation-1' }));
    const request = fetch.mock.calls[0][1];
    expect(fetch.mock.calls[0][0]).toBe('/api/notification-event');
    expect(request.headers.Authorization).toBe('Bearer token-1');
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      type: 'group_message',
      recipientIds: ['user-a', 'user-b'],
      eventId: 'operation-1',
    }));
  });

  it('refreshes authentication once after a 401 without changing the event id', async () => {
    getAuthenticatedIdToken.mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ code: 'unauthenticated' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await emitNotificationEvent({ type: 'like', recipientId: 'user-b', eventId: 'vote-1' });

    expect(getAuthenticatedIdToken).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(JSON.parse(fetch.mock.calls[1][1].body).eventId).toBe('vote-1');
  });

  it('retries one transient server error and preserves failure information', async () => {
    fetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: 'temporary' }) })
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: 'temporary' }) });

    await expect(emitNotificationEvent({
      type: 'comment', recipientId: 'user-b', eventId: 'comment-1',
    })).resolves.toEqual({ ok: false, code: 'temporary', eventId: 'comment-1' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
