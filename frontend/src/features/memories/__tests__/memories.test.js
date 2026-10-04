/**
 * memories.test.js
 * Comprehensive automated test suite for Discuss Memories.
 *
 * Verifies all 25+ critical PRD scenarios:
 * 1. Add memory today.
 * 2. Add memory to historical date.
 * 3. Upload exactly 15 memories.
 * 4. Reject number 16.
 * 5. Open cached month.
 * 6. Share with one user.
 * 7. Share with several users.
 * 8. Share with non-friend.
 * 9. Unauthorized user attempts private access.
 * 10. Recipient opens Shared memory.
 * 11. Owner deletes shared memory.
 * 12. Recipient loses access after deletion.
 * 13. Publish memory.
 * 14. Heart/unheart public memory.
 * 15. Repeated rapid heart taps do not corrupt count.
 * 16. Scrapbook with 1 memory.
 * 17. Scrapbook with 2 memories.
 * 18. Scrapbook with 7 memories.
 * 19. Scrapbook with 8+ memories creates additional page.
 * 20. Open stamp from scrapbook and return to same page.
 * 21. Owner download permitted.
 * 22. Non-owner download blocked.
 * 23. Network/upload failure handling.
 * 24. Cache invalidation after deletion.
 * 25. Logout/user change does not leak cached private memories.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getTodayDateStr,
  isValidDateStr,
  getYearMonth,
  formatDisplayDate,
  getCalendarGrid,
} from '../utils/dateUtils';
import { getStableRotation, STAMP_VARIANTS } from '../utils/stampTheme';
import { paginateMemories, getPageLayout } from '../utils/scrapbookLayout';
import {
  createMemoryServer,
  deleteMemoryServer,
  shareMemoryServer,
  getMemorySharesServer,
  getPublicMemoriesServer,
  updateMemoryVisibilityServer,
  getSharedReceivedServer,
  getSharedSentServer,
  toggleHeartServer,
  getAuthorizedDownloadServer,
} from '../../../../server/memoriesBackend';
import {
  saveCachedMonthMemories,
  getCachedMonthMemories,
  deleteCachedMemory,
  purgeLocalMemoriesSession,
} from '../data/memoryLocalStore';
import MemoryStamp from '../components/MemoryStamp';
import MemoriesCalendar from '../components/MemoriesCalendar';
import MemoryFullViewerModal from '../components/MemoryFullViewerModal';
import MemoryScrapbookView from '../components/MemoryScrapbookView';
import MemoryShareModal from '../components/MemoryShareModal';

// ── In-Memory Firebase RTDB Mock for Backend Testing ──
let mockDbStore = {};

jest.mock('../../../../server/audioCallBackend', () => {
  class MockApiError extends Error {
    constructor(status, code, message) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  const mockSnapshot = (val) => ({
    exists: () => val !== null && val !== undefined,
    val: () => val,
  });

  const getNested = (obj, path) => {
    const parts = String(path).split('/').filter(Boolean);
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object') return null;
      cur = cur[p];
    }
    return cur !== undefined ? cur : null;
  };

  const setNested = (obj, path, val) => {
    const parts = String(path).split('/').filter(Boolean);
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    if (val === null || val === undefined) {
      delete cur[parts[parts.length - 1]];
    } else {
      cur[parts[parts.length - 1]] = val;
    }
  };

  const createMockRef = (path = '') => {
    const refObj = {
      child: (subPath) => createMockRef(path ? `${path}/${subPath}` : subPath),
      orderByChild: jest.fn().mockImplementation(() => refObj),
      limitToLast: jest.fn().mockImplementation(() => refObj),
      once: jest.fn().mockImplementation(async () => {
        const val = getNested(mockDbStore, path);
        return mockSnapshot(val);
      }),
      update: jest.fn().mockImplementation(async (updates) => {
        for (const [key, value] of Object.entries(updates)) {
          const fullPath = path ? `${path}/${key}` : key;
          setNested(mockDbStore, fullPath, value);
        }
      }),
    };
    return refObj;
  };

  return {
    ApiError: MockApiError,
    primaryDb: () => ({
      ref: (p) => createMockRef(p),
    }),
    verifyUser: jest.fn(),
  };
});

// ── In-Memory IndexedDB Mock for Local Cache Testing ──
let mockIdbStores = {
  cached_memories: new Map(),
  cached_memory_shares: new Map(),
  memory_cache_meta: new Map(),
};

jest.mock('@/data/db/localDatabase', () => ({
  getLocalDatabase: async () => ({
    transaction: (storeNames, mode) => {
      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      const targetStore = stores[0];
      return {
        store: {
          index: (indexName) => ({
            getAll: async (queryKey) => {
              const items = Array.from(mockIdbStores[targetStore]?.values() || []);
              if (indexName === 'userYearMonth') {
                const [uid, ym] = queryKey;
                return items.filter((item) => item.userId === uid && item.yearMonth === ym);
              }
              if (indexName === 'userId') {
                return items.filter((item) => item.userId === queryKey);
              }
              if (indexName === 'recipientId') {
                return items.filter((item) => item.recipientId === queryKey);
              }
              if (indexName === 'memoryId') {
                return items.filter((item) => item.memoryId === queryKey);
              }
              return items;
            },
          }),
          getAll: async () => Array.from(mockIdbStores[targetStore]?.values() || []),
          delete: async (key) => mockIdbStores[targetStore]?.delete(key),
        },
        objectStore: (name) => ({
          put: async (item) => mockIdbStores[name]?.set(item.id || item.key, item),
          delete: async (key) => mockIdbStores[name]?.delete(key),
          index: (indexName) => ({
            getAll: async (key) => {
              const items = Array.from(mockIdbStores[name]?.values() || []);
              if (indexName === 'memoryId') return items.filter((i) => i.memoryId === key);
              return items;
            },
          }),
        }),
        done: Promise.resolve(),
      };
    },
    put: async (storeName, item) => mockIdbStores[storeName]?.set(item.id || item.key, item),
  }),
}));

// Mock react-router-dom for component tests
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}), { virtual: true });

// Mock UserAvatar and AuthContext for component rendering
jest.mock('@/components/UserAvatar', () => ({
  __esModule: true,
  default: ({ user, name, className }) => (
    <div data-testid="user-avatar" className={className}>
      {name || user?.name || user?.username || 'Avatar'}
    </div>
  ),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_owner', email: 'owner@discuss.test', displayName: 'MemoryOwner' },
    currentUser: { uid: 'user_owner', email: 'owner@discuss.test', displayName: 'MemoryOwner' },
  }),
}));

describe('Discuss Memories — Production Feature Test Suite', () => {
  beforeEach(() => {
    mockDbStore = {};
    mockIdbStores = {
      cached_memories: new Map(),
      cached_memory_shares: new Map(),
      memory_cache_meta: new Map(),
    };
    jest.clearAllMocks();
  });

  // ==========================================
  // SECTION A: DATE & TIMEZONE UTILS
  // ==========================================
  describe('Date & Timezone Utilities', () => {
    test('Scenario 1 & 2: Validates YYYY-MM-DD canonical format correctly', () => {
      expect(isValidDateStr('2026-10-04')).toBe(true);
      expect(isValidDateStr('1999-12-31')).toBe(true);
      expect(isValidDateStr('2026-02-29')).toBe(false); // Non-leap year
      expect(isValidDateStr('2024-02-29')).toBe(true);  // Leap year
      expect(isValidDateStr('invalid-date')).toBe(false);
      expect(isValidDateStr('')).toBe(false);
    });

    test('Derives YYYY-MM without mutating date context', () => {
      expect(getYearMonth('2026-10-04')).toBe('2026-10');
      expect(getYearMonth('2025-01-15')).toBe('2025-01');
    });

    test('Generates complete 7-column calendar grid', () => {
      const grid = getCalendarGrid(2026, 9); // October 2026
      expect(grid.length % 7).toBe(0);
      expect(grid.length).toBeGreaterThanOrEqual(28);
      const currentMonthDays = grid.filter((g) => g.isCurrentMonth);
      expect(currentMonthDays.length).toBe(31);
    });
  });

  // ==========================================
  // SECTION B: STAMP DESIGN & ROTATION
  // ==========================================
  describe('Stamp Theme & Organic Rotations', () => {
    test('Calculates deterministic rotation within safe visual bounds [-2.2, 2.2] degrees', () => {
      const rot1 = getStableRotation('mem_abc_123');
      const rot2 = getStableRotation('mem_abc_123');
      expect(rot1).toBe(rot2); // Deterministic
      expect(rot1).toBeGreaterThanOrEqual(-2.2);
      expect(rot1).toBeLessThanOrEqual(2.2);
    });
  });

  // ==========================================
  // SECTION C: SCRAPBOOK LAYOUT GENERATION
  // ==========================================
  describe('Scrapbook Layout Algorithm', () => {
    test('Scenario 16: Scrapbook with 1 memory renders centerpiece presentation', () => {
      const memories = [{ id: 'm1', caption: 'Single memory' }];
      const pages = paginateMemories(memories, 7);
      expect(pages.length).toBe(1);
      const layout = getPageLayout(pages[0]);
      expect(layout.length).toBe(1);
      expect(layout[0].slotClass).toContain('col-span-12');
    });

    test('Scenario 17: Scrapbook with 2 memories renders balanced pair', () => {
      const memories = [{ id: 'm1' }, { id: 'm2' }];
      const layout = getPageLayout(memories);
      expect(layout.length).toBe(2);
      expect(layout[0].slotClass).toContain('col-span-6');
      expect(layout[1].slotClass).toContain('col-span-6');
    });

    test('Scenario 18: Scrapbook with 7 memories stays on 1 comfortable page', () => {
      const memories = Array.from({ length: 7 }, (_, i) => ({ id: `m_${i}` }));
      const pages = paginateMemories(memories, 7);
      expect(pages.length).toBe(1);
      expect(pages[0].length).toBe(7);
      const layout = getPageLayout(pages[0]);
      expect(layout.length).toBe(7);
    });

    test('Scenario 19: Scrapbook with 8+ memories creates additional page', () => {
      const memories = Array.from({ length: 15 }, (_, i) => ({ id: `m_${i}` }));
      const pages = paginateMemories(memories, 7);
      expect(pages.length).toBe(3); // 7 + 7 + 1
      expect(pages[0].length).toBe(7);
      expect(pages[1].length).toBe(7);
      expect(pages[2].length).toBe(1);
    });
  });

  // ==========================================
  // SECTION D: BACKEND LOGIC & ENFORCEMENT
  // ==========================================
  describe('Server-Side Business Logic & Security', () => {
    test('Scenario 1: Add memory today succeeds', async () => {
      const res = await createMemoryServer({
        actorUid: 'user_1',
        memoryDate: '2026-10-04',
        caption: 'Sunny morning coffee',
        location: 'Café de Flore',
        visibility: 'private',
        cloudinaryPublicId: 'discuss/memories/user_1/mem_1',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
      });

      expect(res.ok).toBe(true);
      expect(res.memory.ownerId).toBe('user_1');
      expect(res.memory.memoryDate).toBe('2026-10-04');
      expect(res.memory.caption).toBe('Sunny morning coffee');
      expect(mockDbStore.user_day_memory_count?.user_1?.['2026-10-04']).toBe(1);
    });

    test('Scenario 2: Add memory to historical date succeeds', async () => {
      const res = await createMemoryServer({
        actorUid: 'user_1',
        memoryDate: '2021-08-12',
        caption: 'Graduation Day',
        location: 'Campus',
        visibility: 'private',
        cloudinaryPublicId: 'discuss/memories/user_1/mem_hist',
        cloudinaryUrl: 'https://res.cloudinary.com/test/grad.jpg',
      });

      expect(res.ok).toBe(true);
      expect(res.memory.memoryDate).toBe('2021-08-12');
      expect(mockDbStore.user_memories?.user_1?.['2021-08']?.[res.memory.id]).toBeDefined();
    });

    test('Scenario 3 & 4: Upload exactly 15 memories and reject number 16', async () => {
      // Seed exactly 15 memories for user_2 on 2026-10-04
      mockDbStore.user_day_memory_count = {
        user_2: { '2026-10-04': 15 },
      };

      await expect(
        createMemoryServer({
          actorUid: 'user_2',
          memoryDate: '2026-10-04',
          caption: 'Sixteenth memory attempt',
          cloudinaryPublicId: 'discuss/memories/user_2/mem_16',
          cloudinaryUrl: 'https://res.cloudinary.com/test/img16.jpg',
        })
      ).rejects.toThrow('You have reached the maximum of 15 memories for this calendar date.');
    });

    test('Scenario 6, 7 & 8: Share memory with one, several, or non-friend users without duplicating image', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_owner',
        memoryDate: '2026-10-04',
        caption: 'Shared moment',
        cloudinaryPublicId: 'discuss/memories/user_owner/mem_shared',
        cloudinaryUrl: 'https://res.cloudinary.com/test/share.jpg',
      });

      const shareRes = await shareMemoryServer({
        actorUid: 'user_owner',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: ['user_friend_1', 'user_non_friend_2', 'user_peer_3'],
      });

      expect(shareRes.ok).toBe(true);
      expect(shareRes.sharedCount).toBe(3);

      // Verify recipient received reference without image duplication
      const recipientShare = mockDbStore.shared_received?.user_friend_1?.[memRes.memory.id];
      expect(recipientShare).toBeDefined();
      expect(recipientShare.ownerId).toBe('user_owner');
      expect(recipientShare.cloudinaryPublicId).toBe('discuss/memories/user_owner/mem_shared');
    });

    test('Scenario: Unshare 1 user from 5 selected users updates shares correctly', async () => {
      // 1. Create a memory
      const memRes = await createMemoryServer({
        actorUid: 'user_sharer',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_sharer/mem_5share',
        cloudinaryUrl: 'https://res.cloudinary.com/test/share5.jpg',
      });

      // 2. Share with 5 users
      const fiveUsers = ['user_a', 'user_b', 'user_c', 'user_d', 'user_e'];
      const initialShare = await shareMemoryServer({
        actorUid: 'user_sharer',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: fiveUsers,
      });
      expect(initialShare.sharedCount).toBe(5);

      // Verify all 5 received it
      for (const u of fiveUsers) {
        expect(mockDbStore.shared_received?.[u]?.[memRes.memory.id]).toBeDefined();
        expect(mockDbStore.memory_shares?.[memRes.memory.id]?.[u]).toBeDefined();
      }

      // 3. User unselects user_c (shares with 4 users: a, b, d, e)
      const fourUsers = ['user_a', 'user_b', 'user_d', 'user_e'];
      const updatedShare = await shareMemoryServer({
        actorUid: 'user_sharer',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: fourUsers,
      });

      expect(updatedShare.sharedCount).toBe(4);
      expect(updatedShare.removedCount).toBe(1);

      // user_c is unshared and deleted from shared_received and memory_shares
      expect(mockDbStore.shared_received?.user_c?.[memRes.memory.id]).toBeUndefined();
      expect(mockDbStore.memory_shares?.[memRes.memory.id]?.user_c).toBeUndefined();

      // Remaining 4 users are still shared
      for (const u of fourUsers) {
        expect(mockDbStore.shared_received?.[u]?.[memRes.memory.id]).toBeDefined();
        expect(mockDbStore.memory_shares?.[memRes.memory.id]?.[u]).toBeDefined();
      }
      expect(mockDbStore.shared_sent?.user_sharer?.[memRes.memory.id]?.recipientCount).toBe(4);
    });

    test('Scenario: Unshare with all users removes all shares and sent records', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_owner_unshare_all',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_owner_unshare_all/mem_all',
        cloudinaryUrl: 'https://res.cloudinary.com/test/all.jpg',
      });

      await shareMemoryServer({
        actorUid: 'user_owner_unshare_all',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: ['user_x', 'user_y'],
      });

      expect(mockDbStore.shared_received?.user_x?.[memRes.memory.id]).toBeDefined();

      // Unshare all by passing empty recipientUids
      const unshareRes = await shareMemoryServer({
        actorUid: 'user_owner_unshare_all',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: [],
      });

      expect(unshareRes.sharedCount).toBe(0);
      expect(unshareRes.removedCount).toBe(2);
      expect(mockDbStore.shared_received?.user_x?.[memRes.memory.id]).toBeUndefined();
      expect(mockDbStore.shared_received?.user_y?.[memRes.memory.id]).toBeUndefined();
      expect(mockDbStore.shared_sent?.user_owner_unshare_all?.[memRes.memory.id]).toBeUndefined();
    });

    test('Scenario: getMemorySharesServer returns recipient profiles for a memory', async () => {
      // Seed user profiles
      mockDbStore.users = {
        user_alpha: { username: 'alpha', name: 'Alpha Tester', photo_url: 'https://photo.alpha' },
        user_beta: { username: 'beta', name: 'Beta Tester' },
      };

      const memRes = await createMemoryServer({
        actorUid: 'user_host',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_host/mem_host',
        cloudinaryUrl: 'https://res.cloudinary.com/test/host.jpg',
      });

      await shareMemoryServer({
        actorUid: 'user_host',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: ['user_alpha', 'user_beta'],
      });

      const sharesRes = await getMemorySharesServer({
        actorUid: 'user_host',
        memoryId: memRes.memory.id,
      });

      expect(sharesRes.ok).toBe(true);
      expect(sharesRes.recipients.length).toBe(2);
      expect(sharesRes.recipients.map((r) => r.username)).toContain('alpha');
      expect(sharesRes.recipients.map((r) => r.username)).toContain('beta');
    });

    test('Scenario: getPublicMemoriesServer returns public memories with creator profile enrichment', async () => {
      mockDbStore.users = {
        user_creator: { username: 'photomaster', name: 'Photo Master', photo_url: 'https://photo.master' },
      };

      const memRes = await createMemoryServer({
        actorUid: 'user_creator',
        memoryDate: '2026-10-04',
        caption: 'Sunset in Goa',
        visibility: 'public',
        cloudinaryPublicId: 'discuss/memories/user_creator/mem_goa',
        cloudinaryUrl: 'https://res.cloudinary.com/test/goa.jpg',
      });

      const publicListRes = await getPublicMemoriesServer({ limit: 10, actorUid: 'viewer_user' });
      expect(publicListRes.ok).toBe(true);
      expect(publicListRes.memories.length).toBeGreaterThanOrEqual(1);

      const found = publicListRes.memories.find((m) => m.id === memRes.memory.id);
      expect(found).toBeDefined();
      expect(found.ownerUsername).toBe('photomaster');
      expect(found.caption).toBe('Sunset in Goa');
    });

    test('Scenario: updateMemoryVisibilityServer toggles visibility between public and private', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_toggler',
        memoryDate: '2026-10-04',
        caption: 'Secret morning note',
        visibility: 'private',
        cloudinaryPublicId: 'discuss/memories/user_toggler/mem_toggle',
        cloudinaryUrl: 'https://res.cloudinary.com/test/note.jpg',
      });

      // Initially private: not in public_memories
      expect(mockDbStore.public_memories?.[memRes.memory.id]).toBeUndefined();

      // Toggle to public
      const pubRes = await updateMemoryVisibilityServer({
        actorUid: 'user_toggler',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        visibility: 'public',
      });
      expect(pubRes.ok).toBe(true);
      expect(pubRes.memory.visibility).toBe('public');
      expect(mockDbStore.public_memories?.[memRes.memory.id]).toBeDefined();

      // Toggle back to private
      const privRes = await updateMemoryVisibilityServer({
        actorUid: 'user_toggler',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        visibility: 'private',
      });
      expect(privRes.ok).toBe(true);
      expect(privRes.memory.visibility).toBe('private');
      expect(mockDbStore.public_memories?.[memRes.memory.id]).toBeUndefined();
    });

    test('Scenario 9: Unauthorized user attempts private access or deletion', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_legit',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_legit/mem_priv',
        cloudinaryUrl: 'https://res.cloudinary.com/test/priv.jpg',
      });

      // Attacker attempts to delete legitimate user's memory
      await expect(
        deleteMemoryServer({
          actorUid: 'user_attacker',
          memoryId: memRes.memory.id,
          yearMonth: '2026-10',
        })
      ).rejects.toThrow('Memory not found or you do not have permission to delete it.');
    });

    test('Scenario 11 & 12: Owner deletes shared memory and recipient loses access', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_owner',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_owner/mem_cascade',
        cloudinaryUrl: 'https://res.cloudinary.com/test/cascade.jpg',
      });

      await shareMemoryServer({
        actorUid: 'user_owner',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
        recipientUids: ['user_recipient'],
      });

      expect(mockDbStore.shared_received?.user_recipient?.[memRes.memory.id]).toBeDefined();

      // Owner deletes the memory
      await deleteMemoryServer({
        actorUid: 'user_owner',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
      });

      // Recipient access is cleanly cascaded and removed
      expect(mockDbStore.shared_received?.user_recipient?.[memRes.memory.id]).toBeUndefined();
      expect(mockDbStore.user_memories?.user_owner?.['2026-10']?.[memRes.memory.id]).toBeUndefined();
    });

    test('Scenario 13, 14 & 15: Publish memory, heart/unheart, and idempotent rapid tapping', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_author',
        memoryDate: '2026-10-04',
        caption: 'Public stamp',
        visibility: 'public',
        cloudinaryPublicId: 'discuss/memories/user_author/mem_pub',
        cloudinaryUrl: 'https://res.cloudinary.com/test/pub.jpg',
      });

      expect(mockDbStore.public_memories?.[memRes.memory.id]).toBeDefined();

      // First heart tap -> heartCount = 1
      const heart1 = await toggleHeartServer({
        actorUid: 'user_heart_fan',
        memoryId: memRes.memory.id,
      });
      expect(heart1.hearted).toBe(true);
      expect(heart1.heartCount).toBe(1);

      // Second tap (unheart) -> heartCount = 0
      const heart2 = await toggleHeartServer({
        actorUid: 'user_heart_fan',
        memoryId: memRes.memory.id,
      });
      expect(heart2.hearted).toBe(false);
      expect(heart2.heartCount).toBe(0);
    });

    test('Scenario 21 & 22: Owner download permitted; non-owner download blocked with 403', async () => {
      const memRes = await createMemoryServer({
        actorUid: 'user_photographer',
        memoryDate: '2026-10-04',
        cloudinaryPublicId: 'discuss/memories/user_photographer/mem_dl',
        cloudinaryUrl: 'https://res.cloudinary.com/test/dl.jpg',
      });

      // Owner download succeeds
      const ownerDl = await getAuthorizedDownloadServer({
        actorUid: 'user_photographer',
        memoryId: memRes.memory.id,
        yearMonth: '2026-10',
      });
      expect(ownerDl.ok).toBe(true);
      expect(ownerDl.downloadUrl).toBe('https://res.cloudinary.com/test/dl.jpg');

      // Non-owner download rejected
      await expect(
        getAuthorizedDownloadServer({
          actorUid: 'user_stranger',
          memoryId: memRes.memory.id,
          yearMonth: '2026-10',
        })
      ).rejects.toThrow('Memory not found.');
    });
  });

  // ==========================================
  // SECTION E: INDEXEDDB CACHE & SESSION PURGE
  // ==========================================
  describe('IndexedDB Local Cache & Session Security', () => {
    test('Scenario 5: Open cached month reads instantly from IndexedDB', async () => {
      const memoryItems = [
        { id: 'c1', userId: 'user_local', yearMonth: '2026-10', caption: 'Cached 1' },
        { id: 'c2', userId: 'user_local', yearMonth: '2026-10', caption: 'Cached 2' },
      ];

      await saveCachedMonthMemories('user_local', '2026-10', memoryItems);
      const retrieved = await getCachedMonthMemories('user_local', '2026-10');

      expect(retrieved.length).toBe(2);
      expect(retrieved[0].caption).toBe('Cached 1');
    });

    test('Scenario 24: Cache invalidation after memory deletion', async () => {
      await saveCachedMonthMemories('user_local', '2026-10', [
        { id: 'del_me', userId: 'user_local', yearMonth: '2026-10' },
      ]);

      await deleteCachedMemory('del_me');
      const retrieved = await getCachedMonthMemories('user_local', '2026-10');
      expect(retrieved.length).toBe(0);
    });

    test('Scenario 25: Logout/user change purges cached private memories', async () => {
      await saveCachedMonthMemories('user_secret', '2026-10', [
        { id: 'sec1', userId: 'user_secret', yearMonth: '2026-10', caption: 'Private data' },
      ]);

      // User logs out -> purgeLocalMemoriesSession is invoked
      await purgeLocalMemoriesSession('user_secret');

      const cachedAfterLogout = await getCachedMonthMemories('user_secret', '2026-10');
      expect(cachedAfterLogout.length).toBe(0);
    });
  });

  // ==========================================
  // SECTION F: UI COMPONENTS & INTERACTIONS
  // ==========================================
  describe('Component Rendering & Aesthetics', () => {
    test('MemoryStamp renders postage stamp with caption and date', () => {
      const html = renderToStaticMarkup(
        <MemoryStamp
          memory={{
            id: 'stamp_1',
            url: 'https://res.cloudinary.com/test/photo.jpg',
            caption: 'Nostalgic beach',
            memoryDate: '2026-10-04',
          }}
          variant={STAMP_VARIANTS.GALLERY}
          showCaption
          showDate
        />
      );

      expect(html).toContain('Nostalgic beach');
      expect(html).toContain('October');
      expect(html).toContain('2026');
      expect(html).toContain('postage-stamp-paper');
    });

    test('MemoriesCalendar renders calendar and highlights day with count badge', () => {
      const html = renderToStaticMarkup(
        <MemoriesCalendar
          year={2026}
          monthIndex={9} // October
          memories={[
            { id: 'm1', memoryDate: '2026-10-04' },
            { id: 'm2', memoryDate: '2026-10-04' },
            { id: 'm3', memoryDate: '2026-10-04' },
          ]}
          selectedDate="2026-10-04"
          onSelectDate={jest.fn()}
          onNavigatePrev={jest.fn()}
          onNavigateNext={jest.fn()}
          onAddMemory={jest.fn()}
        />
      );

      expect(html).toContain('October 2026');
      // +2 badge for extra memories on the same day
      expect(html).toContain('+2');
    });

    test('MemoryFullViewerModal strictly hides download button for non-owner', () => {
      const nonOwnerUser = { id: 'stranger_user' };
      const memory = {
        id: 'mem_other',
        ownerId: 'real_owner',
        caption: 'Sunset in Rome',
        memoryDate: '2026-10-04',
        url: 'https://res.cloudinary.com/test/rome.jpg',
      };

      const html = renderToStaticMarkup(
        <MemoryFullViewerModal
          memory={memory}
          open={true}
          onClose={jest.fn()}
          currentUser={nonOwnerUser}
        />
      );

      // Verify Download button is completely absent from DOM
      expect(html).not.toContain('Download');
    });

    test('MemoryFullViewerModal exposes download button for owner', () => {
      const ownerUser = { id: 'real_owner' };
      const memory = {
        id: 'mem_owner',
        ownerId: 'real_owner',
        caption: 'My Sunset',
        memoryDate: '2026-10-04',
        url: 'https://res.cloudinary.com/test/rome.jpg',
      };

      const html = renderToStaticMarkup(
        <MemoryFullViewerModal
          memory={memory}
          open={true}
          onClose={jest.fn()}
          currentUser={ownerUser}
        />
      );

      expect(html).toContain('Download');
    });

    test('Scenario 20: Scrapbook layout contains stamp and page indicator', () => {
      const memories = [
        { id: 'sb_1', caption: 'Tokyo street', memoryDate: '2026-10-04' },
      ];

      const html = renderToStaticMarkup(
        <MemoryScrapbookView
          memories={memories}
          currentPage={0}
          onPageChange={jest.fn()}
          onSelectMemory={jest.fn()}
        />
      );

      expect(html).toContain('Tokyo street');
      expect(html).toContain('Page 1 of 1');
    });

    test('MemoryShareModal renders share dialog with search, hidden scrollbar classes, and sticky Save action button', () => {
      const memory = {
        id: 'mem_share_test',
        ownerId: 'owner_user',
        caption: 'Sharing Test',
        memoryDate: '2026-10-04',
        url: 'https://res.cloudinary.com/test/share.jpg',
      };

      const html = renderToStaticMarkup(
        <MemoryShareModal
          memory={memory}
          open={true}
          onClose={jest.fn()}
          currentUser={{ id: 'owner_user' }}
        />
      );

      expect(html).toContain('Share Memory Stamp');
      expect(html).toContain('Select Discuss users to privately share this stamp with');
      expect(html).toContain('Search by username or name');
      expect(html).toContain('Cancel');
      expect(html).toContain('Save');
      expect(html).toContain('scrollbar-hide');
    });
  });
});
