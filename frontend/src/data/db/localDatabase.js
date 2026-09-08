import { openDB } from 'idb';

export const LOCAL_DATABASE_NAME = 'discuss_cache';
export const LOCAL_DATABASE_VERSION = 6;

let databasePromise;

const ensureStore = (db, transaction, name, options, indexes = []) => {
  const store = db.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : db.createObjectStore(name, options);

  indexes.forEach(([indexName, keyPath, indexOptions]) => {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath, indexOptions);
    }
  });
};

/**
 * Opens the single versioned structured cache used by VNext.
 *
 * The upgrade is strictly additive: every pre-VNext store and key path is
 * retained so older cache consumers continue to work while repositories are
 * migrated one feature at a time.
 */
export const getLocalDatabase = () => {
  if (!databasePromise) {
    databasePromise = openDB(LOCAL_DATABASE_NAME, LOCAL_DATABASE_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        ensureStore(db, transaction, 'posts', { keyPath: 'id' }, [
          ['timestamp', 'timestamp'],
          ['author_id', 'author_id'],
        ]);
        ensureStore(db, transaction, 'users', { keyPath: 'id' }, [
          ['username', 'username'],
        ]);
        ensureStore(db, transaction, 'friends', { keyPath: 'id' });
        ensureStore(db, transaction, 'chats', { keyPath: 'chatId' }, [
          ['lastMessageTime', 'lastMessageTime'],
        ]);
        ensureStore(db, transaction, 'messages', { keyPath: 'id' }, [
          ['chatId', 'chatId'],
          ['timestamp', 'timestamp'],
        ]);
        ensureStore(db, transaction, 'cache_meta', { keyPath: 'key' }, [
          ['lastAccessedAt', 'lastAccessedAt'],
          ['staleAt', 'staleAt'],
        ]);
        ensureStore(db, transaction, 'comments', { keyPath: 'cacheKey' }, [
          ['postId', 'postId'],
          ['timestamp', 'timestamp'],
        ]);
        ensureStore(db, transaction, 'groups', { keyPath: 'groupId' }, [
          ['lastMessageTime', 'lastMessageTime'],
        ]);
        ensureStore(db, transaction, 'group_messages', { keyPath: 'id' }, [
          ['groupId', 'groupId'],
          ['timestamp', 'timestamp'],
        ]);

        // VNext stores. These do not modify or rewrite existing cached rows.
        ensureStore(db, transaction, 'profiles', { keyPath: 'id' }, [
          ['updatedAt', 'updatedAt'],
        ]);
        ensureStore(db, transaction, 'feed_pages', { keyPath: 'key' }, [
          ['lastAccessedAt', 'lastAccessedAt'],
        ]);
        ensureStore(db, transaction, 'relationships', { keyPath: 'key' }, [
          ['userId', 'userId'],
        ]);
        ensureStore(db, transaction, 'notifications', { keyPath: 'id' }, [
          ['recipientId', 'recipientId'],
          ['createdAt', 'createdAt'],
          ['read', 'read'],
        ]);
        ensureStore(db, transaction, 'draft_posts', { keyPath: 'id' }, [
          ['userId', 'userId'],
          ['updatedAt', 'updatedAt'],
        ]);
        ensureStore(db, transaction, 'draft_messages', { keyPath: 'id' }, [
          ['userId', 'userId'],
          ['conversationId', 'conversationId'],
          ['updatedAt', 'updatedAt'],
        ]);
        ensureStore(db, transaction, 'outbox', { keyPath: 'operationId' }, [
          ['status', 'status'],
          ['userId', 'userId'],
          ['nextAttemptAt', 'nextAttemptAt'],
          ['createdAt', 'createdAt'],
        ]);
        ensureStore(db, transaction, 'sync_state', { keyPath: 'key' }, [
          ['updatedAt', 'updatedAt'],
        ]);
      },
      blocked() {
        console.warn('[LOCAL_DB] Upgrade blocked by another open Discuss tab.');
      },
      blocking() {
        databasePromise?.then((db) => db.close()).catch(() => {});
        databasePromise = undefined;
      },
      terminated() {
        databasePromise = undefined;
      },
    });
  }

  return databasePromise;
};

export const closeLocalDatabase = async () => {
  if (!databasePromise) return;
  const db = await databasePromise;
  db.close();
  databasePromise = undefined;
};
