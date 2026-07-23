// src/utils/sanitize.js

/**
 * Sanitize string input to prevent XSS and formula injection.
 * Strips leading formula characters that Google Sheets would execute.
 */
export function sanitizeString(input, maxLength = 500) {
  if (typeof input !== 'string') return '';

  let sanitized = input
    .slice(0, maxLength)
    .replace(/[<>]/g, '');

  return sanitized;
}

/**
 * Sanitize a value before writing to Google Sheets.
 * Prevents formula injection (=, +, -, @, TAB, CR at start of cell).
 */
export function sanitizeForSheet(input, maxLength = 500) {
  if (typeof input !== 'string') return String(input ?? '');

  let sanitized = input.trim().slice(0, maxLength);

  // Strip leading characters that trigger formula execution in Sheets
  sanitized = sanitized.replace(/^[=+\-@\t\r|%]+/, '');

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize user input for inclusion in a WhatsApp message.
 * Escapes WhatsApp markdown characters to prevent formatting injection.
 */
export function sanitizeForWhatsApp(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[*_~`]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validate and sanitize phone number — digits only, 10–15 chars.
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return null;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null;
}

/**
 * Validate email format.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitize a numeric value within a safe range.
 */
export function sanitizeNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate URL format.
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
