import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { loadEnv } from '../config/env.js';

/**
 * AES-256-GCM authenticated encryption. Spec: Build Guide §4 #9 + §8.
 *
 * Format: "v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 * The "v1" prefix lets us rotate scheme without breaking decryption later.
 */

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION = 'v1';

function getKey(): Buffer {
  const env = loadEnv();
  const raw = env.ENCRYPTION_KEY;
  if (!raw) {
    return createHash('sha256').update(`dev:${env.JWT_SECRET}`).digest();
  }
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== KEY_BYTES) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars)`);
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt() expects a string');
  }
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decrypt(packed: string): string {
  if (typeof packed !== 'string') {
    throw new TypeError('decrypt() expects a string');
  }
  const parts = packed.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid encrypted payload format');
  }
  const [, ivHex, authTagHex, ctHex] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`);
}

export function maybeDecrypt(value: string): string {
  return isEncrypted(value) ? decrypt(value) : value;
}
