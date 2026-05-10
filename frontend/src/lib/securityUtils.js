/**
 * Security Utilities for Discuss
 * Handles basic encryption/decryption for sensitive data like media URLs
 */

// Simple XOR-based obfuscation with a fixed key
// This is not military-grade but prevents raw URLs from being exposed in plain text in the DB
const SECRET_KEY = 'discuss_secure_media_vault_2024';

/**
 * Encrypts a string using a simple XOR cipher and Base64 encoding
 * @param {string} text - The text to encrypt
 * @returns {string} Encrypted string
 */
export const encryptData = (text) => {
  if (!text) return '';
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback to plain text
  }
};

/**
 * Decrypts a string previously encrypted with encryptData
 * @param {string} encodedText - The base64 encoded encrypted string
 * @returns {string} Decrypted string
 */
export const decryptData = (encodedText) => {
  if (!encodedText || typeof encodedText !== 'string' || !encodedText.includes('==') && encodedText.length < 10) return encodedText; // Heuristic to detect non-encoded
  try {
    const text = atob(encodedText);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    // Simple validation - media URLs usually start with http
    if (!result.startsWith('http')) return encodedText; 
    return result;
  } catch (error) {
    // If decryption fails, it might not be encrypted
    return encodedText;
  }
};
