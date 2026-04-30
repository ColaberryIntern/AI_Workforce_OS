import { describe, it, expect } from '@jest/globals';
import { encrypt, decrypt, isEncrypted, maybeDecrypt } from '../../src/lib/encryption.js';

describe('encryption', () => {
  it('round-trips a string', () => {
    const plaintext = 'secret value 12345 — with unicode 🎉';
    const ct = encrypt(plaintext);
    expect(ct).not.toEqual(plaintext);
    expect(decrypt(ct)).toEqual(plaintext);
  });

  it('produces a versioned, four-part packed format', () => {
    const ct = encrypt('hello');
    const parts = ct.split(':');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
    for (const p of parts.slice(1)) expect(p).toMatch(/^[0-9a-f]+$/i);
  });

  it('produces distinct ciphertexts for the same plaintext (random IV)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) seen.add(encrypt('same input'));
    expect(seen.size).toBe(30);
  });

  it('detects tampering', () => {
    const ct = encrypt('important');
    const flipped = ct.slice(0, -1) + (ct[ct.length - 1] === 'a' ? 'b' : 'a');
    expect(() => decrypt(flipped)).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => decrypt('not a real ciphertext')).toThrow();
    expect(() => decrypt('v2:00:00:00')).toThrow();
  });

  it('round-trips an empty string', () => {
    const ct = encrypt('');
    expect(decrypt(ct)).toEqual('');
  });

  it('isEncrypted recognizes v1 packed format only', () => {
    expect(isEncrypted(encrypt('x'))).toBe(true);
    expect(isEncrypted('plaintext')).toBe(false);
    expect(isEncrypted('v0:abc:def:ghi')).toBe(false);
  });

  it('maybeDecrypt is a no-op on plaintext', () => {
    expect(maybeDecrypt('plain')).toBe('plain');
    expect(maybeDecrypt(encrypt('secret'))).toBe('secret');
  });
});
