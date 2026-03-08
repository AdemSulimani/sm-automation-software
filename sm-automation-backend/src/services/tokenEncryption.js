/**
 * Enkriptim i tokenave në pushim (at rest) për Channel.accessToken dhe OAuth sesione.
 * Përdor AES-256-GCM. Nëse TOKEN_ENCRYPTION_KEY nuk është vendosur, tokenat ruhen të paenkriptuar (përputhshmëri).
 */

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PREFIX = 'encv1:';

function getKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!raw || raw.length < 32) return null;
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.scryptSync(raw, 'sm-automation-salt', KEY_LENGTH);
}

/**
 * Enkripton një string (p.sh. access token). Nëse nuk ka çelës, kthen vlerën e papërpunuar.
 */
function encrypt(plainText) {
  if (!plainText || typeof plainText !== 'string') return plainText;
  const key = getKey();
  if (!key) return plainText;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, enc]);
    return PREFIX + combined.toString('base64');
  } catch (err) {
    console.error('Token encryption error:', err.message);
    return plainText;
  }
}

/**
 * Çdekripton një string. Nëse nuk fillon me encv1: ose nuk ka çelës, kthen vlerën siç është.
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith(PREFIX)) return cipherText;
  const key = getKey();
  if (!key) return cipherText.slice(PREFIX.length);
  try {
    const combined = Buffer.from(cipherText.slice(PREFIX.length), 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return cipherText;
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const enc = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch (err) {
    console.error('Token decryption error:', err.message);
    return cipherText;
  }
}

/**
 * Kthen accessToken të channel-it të dekriptuar për përdorim (dërgesë mesazhesh).
 * channel mund të jetë dokument Mongoose ose objekt i thjeshtë.
 */
function getPlainAccessToken(channel) {
  if (!channel || !channel.accessToken) return null;
  return decrypt(channel.accessToken);
}

module.exports = {
  encrypt,
  decrypt,
  getPlainAccessToken,
};
