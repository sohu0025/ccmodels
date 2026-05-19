import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
// Derive a consistent 32-byte key from a machine-local seed
const KEY = crypto.scryptSync('cc-switch-local-encryption-seed-2026', 'cc-switch-salt', 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  });
}

export function decrypt(encryptedJson: string): string {
  if (!encryptedJson) return '';
  try {
    const { iv, data, tag } = JSON.parse(encryptedJson);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}
