/**
 * graphemeCounter.js
 * Accurately measures Unicode grapheme clusters for Discuss Letters.
 * Enforces maximum 150 graphemes without miscounting multi-byte or combined emojis.
 */

let segmenterInstance = null;
try {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    segmenterInstance = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  }
} catch (_) {
  segmenterInstance = null;
}

/**
 * Returns the exact grapheme count of a string.
 * @param {string} text 
 * @returns {number}
 */
export const countGraphemes = (text) => {
  if (!text) return 0;
  const str = String(text);
  if (segmenterInstance) {
    let count = 0;
    // eslint-disable-next-line no-unused-vars
    for (const _ of segmenterInstance.segment(str)) {
      count += 1;
    }
    return count;
  }
  return Array.from(str).length;
};

/**
 * Validates whether a letter body satisfies Discuss Letter constraints:
 * - 1 to 150 graphemes
 * - At least 1 non-whitespace character
 * @param {string} text 
 * @returns {{ valid: boolean, count: number, error?: string }}
 */
export const validateLetterBody = (text) => {
  const raw = String(text || '');
  const trimmed = raw.trim();
  const count = countGraphemes(raw);

  if (!trimmed) {
    return { valid: false, count: 0, error: 'Letter body cannot be empty.' };
  }
  if (count > 150) {
    return { valid: false, count, error: `Letter exceeds 150 graphemes (${count}/150).` };
  }
  return { valid: true, count };
};

export const MAX_LETTER_GRAPHEMES = 150;
