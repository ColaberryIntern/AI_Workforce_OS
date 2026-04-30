import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 helpers for outbound webhook signing.
 * Spec: /directives/webhooks.md.
 *
 * Subscribers verify the X-AIWOS-Signature header against the body using
 * the secret returned at registration. Signature is hex-encoded.
 */

export function signHmac(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

export function verifyHmac(secret: string, body: string, signature: string): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false;
  const expected = signHmac(secret, body);
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
