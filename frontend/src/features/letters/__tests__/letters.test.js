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
} from '../data/letterLocalStore';

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
});
