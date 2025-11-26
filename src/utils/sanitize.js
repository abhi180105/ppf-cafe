// src/utils/sanitize.js
// Utility functions for input sanitization and validation

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '');
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - The HTML string to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone number to validate
 * @returns {string|null} - Sanitized phone or null if invalid
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return null;
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }
  
  return null;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize number input
 * @param {any} value - Value to sanitize
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} - Sanitized number
 */
export function sanitizeNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  
  if (isNaN(num)) return min;
  
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidURL(url) {
  if (typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
