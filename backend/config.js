const JWT_SECRET = process.env.JWT_SECRET || 'real_user_auth_secret_2025';

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production.');
}

// XSS Sanitization utility - removes script tags and dangerous attributes
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, 'data-safe:')
    .trim();
}

// Validate and sanitize common text inputs
function validateTextInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  return sanitizeInput(input.substring(0, maxLength));
}

// Check if value is a safe integer
function isSafeInteger(value) {
  const num = parseInt(value);
  return !isNaN(num) && Number.isSafeInteger(num) && num >= 0;
}

module.exports = {
  JWT_SECRET,
  sanitizeInput,
  validateTextInput,
  isSafeInteger
};
