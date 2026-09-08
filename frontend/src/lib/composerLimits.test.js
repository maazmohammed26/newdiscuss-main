describe('Composer Character Limits & Grandfathered Editing Rule', () => {
  const POST_MIN_CHARS = 2;
  const POST_MAX_CHARS = 600;

  const validateNewPostLength = (content) => {
    const trimmed = (content || '').trim();
    if (trimmed.length < POST_MIN_CHARS) {
      return { valid: false, error: 'Post must be at least 2 characters.' };
    }
    if (trimmed.length > POST_MAX_CHARS) {
      return { valid: false, error: 'Post exceeds 600 character limit.' };
    }
    return { valid: true, error: null };
  };

  const getEditPostMaxAllowed = (originalPostContent) => {
    const originalLen = (originalPostContent || '').length;
    return Math.max(POST_MAX_CHARS, originalLen);
  };

  describe('New Post Limits (2–600 characters)', () => {
    it('rejects post shorter than 2 characters or whitespace-only', () => {
      expect(validateNewPostLength('').valid).toBe(false);
      expect(validateNewPostLength(' ').valid).toBe(false);
      expect(validateNewPostLength('a').valid).toBe(false);
    });

    it('accepts valid post between 2 and 600 characters', () => {
      expect(validateNewPostLength('hi').valid).toBe(true);
      expect(validateNewPostLength('A'.repeat(600)).valid).toBe(true);
    });

    it('rejects post exceeding 600 characters', () => {
      expect(validateNewPostLength('A'.repeat(601)).valid).toBe(false);
    });
  });

  describe('Grandfathered Legacy Post Editing Rule', () => {
    it('standard post <= 600 characters is capped at 600', () => {
      const original = 'A standard 150 character post';
      expect(getEditPostMaxAllowed(original)).toBe(600);
    });

    it('legacy post with >600 characters preserves original length ceiling', () => {
      const legacyContent = 'B'.repeat(1200);
      expect(getEditPostMaxAllowed(legacyContent)).toBe(1200);
    });

    it('legacy post with >600 characters locks to 600 once reduced <= 600', () => {
      const legacyContent = 'C'.repeat(850);
      const initialCeiling = getEditPostMaxAllowed(legacyContent);
      expect(initialCeiling).toBe(850);

      // Once edited and saved at 400 characters, new post content has length 400
      const updatedContent = 'C'.repeat(400);
      const newCeiling = getEditPostMaxAllowed(updatedContent);
      expect(newCeiling).toBe(600);
    });
  });
});
