import {
  extractInlineHashtags,
  getActiveHashtagToken,
  replaceHashtagToken,
  queryHashtagSuggestions,
  SEED_COMMUNITY_TAGS,
  MAX_HASHTAGS_PER_POST,
} from './hashtagService';

describe('hashtagService', () => {
  describe('extractInlineHashtags', () => {
    it('extracts unique valid hashtags from text', () => {
      const text = 'Building a new app with #react and #TailwindCSS!';
      const result = extractInlineHashtags(text);
      expect(result.validTags).toEqual(['react', 'tailwindcss']);
      expect(result.allTags).toEqual(['react', 'tailwindcss']);
      expect(result.hasExceededLimit).toBe(false);
    });

    it('deduplicates hashtags case-insensitively', () => {
      const text = '#React is great. I love #REACT and #react';
      const result = extractInlineHashtags(text);
      expect(result.validTags).toEqual(['react']);
      expect(result.allTags).toEqual(['react']);
    });

    it('caps validTags to MAX_HASHTAGS_PER_POST (5), rejects 6th token, and provides exact inline error message', () => {
      const text = 'Check out #one #two #three #four #five #six #seven';
      const result = extractInlineHashtags(text);
      expect(result.validTags).toHaveLength(5);
      expect(result.validTags).toEqual(['one', 'two', 'three', 'four', 'five']);
      expect(result.validTags).not.toContain('six');
      expect(result.validTags).not.toContain('seven');
      expect(result.allTags).toHaveLength(7);
      expect(result.hasExceededLimit).toBe(true);
      expect(result.message).toBe('You can add up to 5 hashtags per post.');
    });

    it('duplicate/case variants of an existing hashtag do not count again towards the 5-tag limit', () => {
      const text = '#one #two #three #four #five #ONE #Five #three';
      const result = extractInlineHashtags(text);
      expect(result.validTags).toHaveLength(5);
      expect(result.hasExceededLimit).toBe(false);
      expect(result.message).toBeNull();
    });

    it('returns empty structures when no hashtags exist', () => {
      expect(extractInlineHashtags('Just a regular discussion post')).toEqual({
        validTags: [],
        allTags: [],
        hasExceededLimit: false,
        message: null,
      });
      expect(extractInlineHashtags('')).toEqual({
        validTags: [],
        allTags: [],
        hasExceededLimit: false,
        message: null,
      });
      expect(extractInlineHashtags(null)).toEqual({
        validTags: [],
        allTags: [],
        hasExceededLimit: false,
        message: null,
      });
    });

    it('ignores lone hash symbols or non-hashtag hashes such as C#', () => {
      const result = extractInlineHashtags('Price is # and C# is cool');
      expect(result.validTags).toEqual([]);
    });
  });

  describe('getActiveHashtagToken', () => {
    it('identifies hashtag token being typed at cursor position', () => {
      const text = 'Hello #rea';
      const cursor = 10;
      const result = getActiveHashtagToken(text, cursor);
      expect(result).not.toBeNull();
      expect(result.query).toBe('rea');
      expect(result.range).toEqual([6, 10]);
    });

    it('returns null if cursor is before the hashtag token', () => {
      const text = 'Hello world #react';
      const cursor = 5;
      expect(getActiveHashtagToken(text, cursor)).toBeNull();
    });

    it('returns empty query if just typed hash symbol with whitespace before it', () => {
      const text = 'Exploring #';
      const cursor = 11;
      const result = getActiveHashtagToken(text, cursor);
      expect(result).not.toBeNull();
      expect(result.query).toBe('');
      expect(result.range).toEqual([10, 11]);
    });
  });

  describe('replaceHashtagToken', () => {
    it('replaces active token with selected tag and appends a trailing space', () => {
      const text = 'Starting #rea project';
      const range = [9, 13];
      const replacement = replaceHashtagToken(text, range, 'react');
      expect(replacement.newText).toBe('Starting #react  project');
      expect(replacement.newCursorPosition).toBe('Starting #react '.length);
    });

    it('normalizes selected tag without extra hashes', () => {
      const text = 'Starting #dev';
      const range = [9, 13];
      const replacement = replaceHashtagToken(text, range, '#devops');
      expect(replacement.newText).toBe('Starting #devops ');
      expect(replacement.newCursorPosition).toBe('Starting #devops '.length);
    });
  });

  describe('queryHashtagSuggestions', () => {
    it('returns suggestions matching prefix from seed tags', async () => {
      const suggestions = await queryHashtagSuggestions('rea', 6);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      const tags = suggestions.map(s => s.tag);
      expect(tags).toContain('react');
    });

    it('returns seed suggestions on empty query', async () => {
      const suggestions = await queryHashtagSuggestions('', 5);
      expect(suggestions).toHaveLength(5);
    });
  });
});
