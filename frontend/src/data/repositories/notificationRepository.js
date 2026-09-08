import { database, ref, get, onValue, off, query, orderByChild, limitToLast, update } from '@/lib/firebase';
import { getLocalDatabase } from '@/data/db/localDatabase';

const CACHE_LIMIT = 200;
const localId = (userId, notificationId) => `${userId}:${notificationId}`;
const fromRow = (row) => ({ ...row, id: row.notificationId || row.id });
const sortNewest = (items) => [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const normalizeSnapshot = (snapshot) => snapshot.exists()
  ? sortNewest(Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })))
  : [];

const cacheNotifications = async (userId, notifications) => {
  const db = await getLocalDatabase();
  const tx = db.transaction('notifications', 'readwrite');
  const existing = (await tx.store.index('recipientId').getAll(userId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const merged = new Map(existing.map((row) => [row.notificationId, row]));
  notifications.forEach((item) => merged.set(item.id, {
    ...item,
    id: localId(userId, item.id),
    notificationId: item.id,
    recipientId: userId,
  }));
  const rows = [...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  for (const row of rows) await tx.store.put(row);
  for (const row of rows.slice(CACHE_LIMIT)) await tx.store.delete(row.id);
  await tx.done;
};

export const getCachedNotifications = async (userId) => {
  if (!userId) return [];
  const db = await getLocalDatabase();
  return sortNewest((await db.getAllFromIndex('notifications', 'recipientId', userId)).map(fromRow));
};

export const getNotifications = async (userId, limit = 50) => {
  const snapshot = await get(query(ref(database, `notifications/${userId}`), orderByChild('createdAt'), limitToLast(Math.min(limit, 100))));
  const items = normalizeSnapshot(snapshot);
  await cacheNotifications(userId, items);
  return items;
};

export const subscribeToNotifications = (userId, callback, limit = 50) => {
  if (!userId) return () => {};
  let cancelled = false;
  getCachedNotifications(userId).then((items) => {
    if (!cancelled && items.length) callback(items, { source: 'cache' });
  }).catch(() => {});
  const notificationsQuery = query(ref(database, `notifications/${userId}`), orderByChild('createdAt'), limitToLast(Math.min(limit, 100)));
  const listener = (snapshot) => {
    const items = normalizeSnapshot(snapshot);
    callback(items, { source: 'remote' });
    cacheNotifications(userId, items).catch(() => {});
  };
  onValue(notificationsQuery, listener, (error) => console.warn('[Notifications] Subscription failed:', error.message));
  return () => {
    cancelled = true;
    off(notificationsQuery, 'value', listener);
  };
};

export const markNotificationRead = async (userId, notificationId) => {
  await update(ref(database, `notifications/${userId}/${notificationId}`), { read: true, readAt: new Date().toISOString() });
  const db = await getLocalDatabase();
  const key = localId(userId, notificationId);
  const row = await db.get('notifications', key);
  if (row) await db.put('notifications', { ...row, read: true, readAt: new Date().toISOString() });
};

export const markAllNotificationsRead = async (userId, notifications) => {
  const unread = notifications.filter((item) => !item.read);
  if (!unread.length) return;
  const readAt = new Date().toISOString();
  const updates = {};
  unread.forEach((item) => { updates[`${item.id}/read`] = true; updates[`${item.id}/readAt`] = readAt; });
  await update(ref(database, `notifications/${userId}`), updates);
  const db = await getLocalDatabase();
  const tx = db.transaction('notifications', 'readwrite');
  for (const item of unread) {
    const key = localId(userId, item.id);
    const row = await tx.store.get(key);
    if (row) await tx.store.put({ ...row, read: true, readAt });
  }
  await tx.done;
};
