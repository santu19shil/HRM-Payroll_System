const crypto = require('crypto');

// NOTE: This encrypts/decrypts the generated employee password so HR can later display it.
// It is intentionally limited to privileged endpoints (SUPER_ADMIN/HR) and never returned to self/employee pages.

const ENC_KEY = process.env.CREDENTIALS_ENC_KEY || 'dev_please_change_me_32bytes_minimum_length';

function normalizeKey(key) {
  // We need 32 bytes for aes-256.
  return crypto.createHash('sha256').update(String(key)).digest();
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(16);
  const key = normalizeKey(ENC_KEY);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Store: iv:encrypted
  return `${iv.toString('base64')}:${encrypted}`;
}

function decryptText(payload) {
  if (!payload) return '';
  const [ivB64, encryptedB64] = String(payload).split(':');
  if (!ivB64 || !encryptedB64) return '';

  const iv = Buffer.from(ivB64, 'base64');
  const key = normalizeKey(ENC_KEY);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encryptText,
  decryptText
};

