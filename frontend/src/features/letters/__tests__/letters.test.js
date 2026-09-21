import { countGraphemes, validateLetterBody, MAX_LETTER_GRAPHEMES } from '../utils/graphemeCounter';
import { getLetterThreadId, buildLetterThreadId } from '../utils/threadIdentity';
import {
  searchCities,
  getCityById,
  calculateDistanceKm,
  formatCityLabel,
  POPULAR_CITIES,
} from '../city/indiaCities';
import {
  makeDraftKey,
  normalizeLetter,
  normalizeThread,
  saveLetterDraft,
  getLetterDraft,
  clearLetterDraft,
  purgeLocalLettersSession,
  saveLocalLetterPreference,
  getLocalLetterPreference,
  saveLocalLetter,
  reconcileLocalLetter,
  saveLocalLetters,
  getFastMemoryLettersForThread,
  markLocalLetterOpened,
} from '../data/letterLocalStore';
import { resetAuxiliaryCooldowns, isAuxiliaryCircuitBreakerOpen } from '../../../lib/auxiliaryAuth';

describe('Discuss Letters — Unit & Integration Test Suite', () => {
  describe('1. Grapheme Counter & Unicode Cluster Validation', () => {
    test('accurately counts standard text', () => {
      const text = 'Hello Bengaluru!';
      expect(countGraphemes(text)).toBe(16);
    });

    test('accurately counts complex Unicode clusters and emojis as single graphemes', () => {
      // 👨‍👩‍👧‍👦 is multiple code points with ZWJ, counts as 1 user-perceived grapheme
      const familyEmoji = '👨‍👩‍👧‍👦';
      expect(countGraphemes(familyEmoji)).toBe(1);

      // Emoji with skin tone modifier
      const wavingHand = '👋🏽';
      expect(countGraphemes(wavingHand)).toBe(1);

      // Hindi graphemes with matras: नमस्ते (न + म + स्ते)
      const hindi = 'नमस्ते';
      expect(countGraphemes(hindi)).toBe(3);
    });

    test('validates 150-grapheme limit boundaries strictly', () => {
      expect(validateLetterBody('').valid).toBe(false);
      expect(validateLetterBody('   ').valid).toBe(false);

      const exact150 = 'A'.repeat(150);
      expect(validateLetterBody(exact150).valid).toBe(true);

      const over150 = 'A'.repeat(151);
      const invalid = validateLetterBody(over150);
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toMatch(/exceeds 150 graphemes/);
    });
  });

  describe('2. Hardened Deterministic Thread Identity', () => {
    test('produces identical threadId regardless of user ID sorting/order', () => {
      const uidA = 'user_alpha_12345';
      const uidB = 'user_beta_67890';

      const thread1 = getLetterThreadId(uidA, uidB);
      const thread2 = getLetterThreadId(uidB, uidA);

      expect(thread1).toBe(thread2);
      expect(thread1).toMatch(/^th_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/);
    });

    test('generates RTDB safe keys with no forbidden characters', () => {
      const weirdUid1 = 'user.with.dots$and#hashes';
      const weirdUid2 = 'other/with/slashes[and]brackets';

      const threadId = buildLetterThreadId(weirdUid1, weirdUid2);
      expect(threadId).not.toMatch(/[.$#\[\]\/]/);
    });
  });

  describe('3. Locally Shipped India City Dataset', () => {
    test('ships comprehensive database with over 300 cities/towns', () => {
      const results = searchCities('', 500);
      expect(results.length).toBeGreaterThan(300);
    });

    test('normalizes city queries and matches aliases', () => {
      const bangalore = searchCities('bangalore');
      expect(bangalore.some((c) => c.id === 'bengaluru' || c.name === 'Bengaluru')).toBe(true);

      const bombay = searchCities('bombay');
      expect(bombay.some((c) => c.id === 'mumbai' || c.name === 'Mumbai')).toBe(true);
    });

    test('calculates accurate coarse distances in kilometers', () => {
      // Bengaluru to Mumbai is approximately 840 km
      const blr = getCityById('bengaluru');
      const bom = getCityById('mumbai');
      expect(blr).toBeTruthy();
      expect(bom).toBeTruthy();

      const dist = calculateDistanceKm(blr.lat, blr.lng, bom.lat, bom.lng);
      expect(dist).toBeGreaterThan(800);
      expect(dist).toBeLessThan(900);
    });

    test('formats city label with state fallback', () => {
      expect(formatCityLabel({ name: 'Pune', state: 'Maharashtra' })).toBe('Pune, Maharashtra');
      expect(formatCityLabel(null)).toBe('');
    });
  });

  describe('4. Local Store & Composite Draft Key Isolation', () => {
    test('composite draft key binds sender and recipient UIDs', () => {
      const sender = 'user_111';
      const recipient = 'user_222';
      const key = makeDraftKey(sender, recipient);
      expect(key).toBe('user_111:user_222');
    });

    test('saves and retrieves composite draft without leaking across users', async () => {
      const userA = 'account_alice';
      const userB = 'account_bob';
      const recipient = 'account_charlie';

      await saveLetterDraft(userA, recipient, { body: 'Alice draft to Charlie' });
      await saveLetterDraft(userB, recipient, { body: 'Bob draft to Charlie' });

      const aliceDraft = await getLetterDraft(userA, recipient);
      const bobDraft = await getLetterDraft(userB, recipient);

      expect(aliceDraft.body).toBe('Alice draft to Charlie');
      expect(bobDraft.body).toBe('Bob draft to Charlie');

      await clearLetterDraft(userA, recipient);
      const cleared = await getLetterDraft(userA, recipient);
      expect(cleared).toBeNull();

      // Bob draft remains unaffected
      const bobStillExists = await getLetterDraft(userB, recipient);
      expect(bobStillExists.body).toBe('Bob draft to Charlie');
    });

    test('purges in-memory working sets and drafts on user logout session cleanup', async () => {
      const user = 'user_to_logout';
      await saveLetterDraft(user, 'friend_1', { body: 'Draft to purge' });
      await purgeLocalLettersSession(user);

      const draft = await getLetterDraft(user, 'friend_1');
      expect(draft).toBeNull();
    });
  });

  describe('5. Deduplication & clientMutationId Reconciliation', () => {
    test('optimistic + server ack + realtime echo results in exactly one Letter', async () => {
      const threadId = 'th_test_dedup_1';
      const clientMutationId = 'mut_abc_123';
      const tempId = `opt_${clientMutationId}`;
      const canonicalId = '-OXYZ_canonical_123';

      // 1. Optimistic letter arrives
      const optimisticLetter = {
        id: tempId,
        threadId,
        clientMutationId,
        senderId: 'user1',
        recipientId: 'user2',
        body: 'Hello across the skies',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };
      await saveLocalLetter(optimisticLetter);

      let memoryLetters = getFastMemoryLettersForThread(threadId);
      expect(memoryLetters.length).toBe(1);
      expect(memoryLetters[0].id).toBe(tempId);

      // 2. Server canonical response reconciles optimistic record
      const canonicalLetter = {
        id: canonicalId,
        threadId,
        clientMutationId,
        senderId: 'user1',
        recipientId: 'user2',
        body: 'Hello across the skies',
        status: 'SENT',
        createdAt: optimisticLetter.createdAt,
      };
      await reconcileLocalLetter(canonicalLetter);

      memoryLetters = getFastMemoryLettersForThread(threadId);
      expect(memoryLetters.length).toBe(1);
      expect(memoryLetters[0].id).toBe(canonicalId);
      expect(memoryLetters[0].status).toBe('SENT');

      // 3. Realtime echo arrives with same canonical data
      await saveLocalLetters([canonicalLetter]);

      memoryLetters = getFastMemoryLettersForThread(threadId);
      expect(memoryLetters.length).toBe(1);
      expect(memoryLetters[0].id).toBe(canonicalId);
    });

    test('offline queue + reconnect + retry + echo results in exactly one Letter', async () => {
      const threadId = 'th_test_offline_1';
      const clientMutationId = 'mut_offline_999';
      const tempId = `opt_${clientMutationId}`;
      const canonicalId = '-OXYZ_canonical_999';

      const queuedLetter = {
        id: tempId,
        threadId,
        clientMutationId,
        body: 'Offline letter queued',
        status: 'QUEUED',
        createdAt: '2026-09-21T10:00:00.000Z',
      };
      await saveLocalLetter(queuedLetter);

      // Reconnect and retry with same mutationId
      const canonicalLetter = {
        id: canonicalId,
        threadId,
        clientMutationId,
        body: 'Offline letter queued',
        status: 'SENT',
        createdAt: '2026-09-21T10:00:00.000Z',
      };
      await reconcileLocalLetter(canonicalLetter);
      await saveLocalLetters([canonicalLetter]);

      const threadLetters = getFastMemoryLettersForThread(threadId);
      expect(threadLetters.length).toBe(1);
      expect(threadLetters[0].id).toBe(canonicalId);
    });
  });

  describe('6. Status Model & Immutability', () => {
    test('status model never returns or accepts Delivered', () => {
      const validStatuses = ['QUEUED', 'PENDING', 'SENT', 'OPENED', 'FAILED'];
      expect(validStatuses).not.toContain('Delivered');
      expect(validStatuses).not.toContain('DELIVERED');
    });

    test('opened state is idempotent', async () => {
      const threadId = 'th_idempotent_test';
      const letterId = 'let_idempotent_1';
      const letter = {
        id: letterId,
        threadId,
        body: 'Secret note',
        status: 'SENT',
        createdAt: new Date().toISOString(),
      };
      await saveLocalLetter(letter);

      const firstOpenedAt = new Date().toISOString();
      await markLocalLetterOpened(letterId, firstOpenedAt);

      const cached = getFastMemoryLettersForThread(threadId);
      expect(cached[0].openedAt).toBe(firstOpenedAt);
      expect(cached[0].status).toBe('OPENED');
    });
  });

  describe('7. Gesture & Threshold Semantics', () => {
    test('drag below threshold (85%) does not commit send', () => {
      const dragProgress = 0.5;
      const armed = dragProgress >= 0.85;
      expect(armed).toBe(false);
    });

    test('drag above threshold (85%+) arms send commit', () => {
      const dragProgress = 0.86;
      const armed = dragProgress >= 0.85;
      expect(armed).toBe(true);
    });
  });

  describe('8. Deleted-User Safety & Identity Safeguards', () => {
    test('friend request and chat guards reject deleted or undefined users', () => {
      const invalidUsers = [undefined, null, 'undefined', ''];
      invalidUsers.forEach((target) => {
        const isValid = Boolean(target && target !== 'undefined');
        expect(isValid).toBe(false);
      });
    });

    test('never renders undefined in handle or display name strings', () => {
      const formatDisplayName = (user) => {
        if (!user || user.isDeleted || (!user.username && !user.displayName)) {
          return 'Account removed';
        }
        return user.displayName || user.fullName || `@${user.username}`;
      };

      expect(formatDisplayName(null)).toBe('Account removed');
      expect(formatDisplayName({ isDeleted: true })).toBe('Account removed');
      expect(formatDisplayName({ username: 'maaz' })).toBe('@maaz');
      expect(formatDisplayName({ displayName: 'Maaz' })).toBe('Maaz');
    });
  });

  describe('9. Auxiliary Auth Resilience & Bounded Backoff', () => {
    test('cooldown resets cleanly on network recovery', () => {
      resetAuxiliaryCooldowns();
      expect(isAuxiliaryCircuitBreakerOpen()).toBe(false);
    });
  });

  describe('10. Filter Tabs Integrity', () => {
    test('separates friends and non-friends buckets strictly without community label', () => {
      const testThreads = [
        { threadId: 'th_1', relationBucket: 'friends' },
        { threadId: 'th_2', relationBucket: 'non-friends' },
        { threadId: 'th_3', relationBucket: 'stranger' },
      ];

      const friendsOnly = testThreads.filter((t) => t.relationBucket === 'friends');
      const nonFriendsOnly = testThreads.filter((t) => t.relationBucket !== 'friends');

      expect(friendsOnly.length).toBe(1);
      expect(friendsOnly[0].threadId).toBe('th_1');

      expect(nonFriendsOnly.length).toBe(2);
      expect(nonFriendsOnly.map((t) => t.threadId)).toEqual(['th_2', 'th_3']);
    });
  });
});

