import {
  markNotificationRead,
  deleteNotification,
  getCachedNotifications,
} from './notificationRepository';
import { getLocalDatabase } from '@/data/db/localDatabase';
import { update, remove, ref } from '@/lib/firebase';

jest.mock('@/lib/firebase', () => ({
  database: {},
  ref: jest.fn(),
  get: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  query: jest.fn((q) => q),
  orderByChild: jest.fn(),
  limitToLast: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/data/db/localDatabase', () => ({
  getLocalDatabase: jest.fn(),
}));

describe('notificationRepository lifecycle', () => {
  const userId = 'user-100';
  const notificationId = 'notif-abc';
  const key = `${userId}:${notificationId}`;
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    ref.mockImplementation((_, path) => ({ path }));
    update.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);

    store = new Map();
    store.set(key, {
      id: key,
      notificationId,
      recipientId: userId,
      title: 'New Reply',
      read: false,
      createdAt: new Date().toISOString(),
    });

    getLocalDatabase.mockResolvedValue({
      get: jest.fn(async (_storeName, k) => store.get(k)),
      put: jest.fn(async (_storeName, val) => {
        store.set(val.id, val);
      }),
      delete: jest.fn(async (_storeName, k) => {
        store.delete(k);
      }),
      getAllFromIndex: jest.fn(async (_storeName, _index, val) => {
        return [...store.values()].filter((item) => item.recipientId === val);
      }),
      transaction: jest.fn(() => ({
        store: {
          index: () => ({
            getAll: async (val) => [...store.values()].filter((item) => item.recipientId === val),
          }),
          put: async (val) => store.set(val.id, val),
          delete: async (k) => store.delete(k),
        },
        done: Promise.resolve(),
      })),
    });
  });

  it('markNotificationRead retains notification in IndexedDB history while marking it read', async () => {
    await markNotificationRead(userId, notificationId);

    // Verify remote RTDB update
    expect(update).toHaveBeenCalled();
    const [pathArg, updateObj] = update.mock.calls[0];
    expect(pathArg.path).toContain(`notifications/${userId}/${notificationId}`);
    expect(updateObj.read).toBe(true);
    expect(updateObj.readAt).toBeDefined();

    // Verify local IndexedDB was NOT hard-deleted, but updated with read: true
    const stored = store.get(key);
    expect(stored).toBeDefined();
    expect(stored.read).toBe(true);
    expect(stored.readAt).toBeDefined();
  });

  it('deleteNotification permanently deletes remotely and removes from local IndexedDB', async () => {
    await deleteNotification(userId, notificationId);

    // Verify remote RTDB remove
    expect(remove).toHaveBeenCalled();
    const [pathArg] = remove.mock.calls[0];
    expect(pathArg.path).toContain(`notifications/${userId}/${notificationId}`);

    // Verify removed from local IndexedDB
    const stored = store.get(key);
    expect(stored).toBeUndefined();

    // Verify it is filtered out of getCachedNotifications
    const cached = await getCachedNotifications(userId);
    expect(cached.find((item) => item.id === notificationId)).toBeUndefined();
  });
});
