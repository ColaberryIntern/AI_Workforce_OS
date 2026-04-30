import { describe, it, expect } from '@jest/globals';
import { signHmac, verifyHmac } from '../../src/lib/hmac.js';

describe('hmac', () => {
  it('produces a stable signature for known input', () => {
    const sig = signHmac('secret', 'hello');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(signHmac('secret', 'hello')).toBe(sig);
  });

  it('changes signature when body changes', () => {
    expect(signHmac('s', 'a')).not.toBe(signHmac('s', 'b'));
  });

  it('changes signature when secret changes', () => {
    expect(signHmac('a', 'body')).not.toBe(signHmac('b', 'body'));
  });

  it('verifyHmac true on matching pair', () => {
    const sig = signHmac('top-secret', 'payload');
    expect(verifyHmac('top-secret', 'payload', sig)).toBe(true);
  });

  it('verifyHmac false on mismatch', () => {
    const sig = signHmac('top-secret', 'payload');
    expect(verifyHmac('top-secret', 'payload-tampered', sig)).toBe(false);
    expect(verifyHmac('different-secret', 'payload', sig)).toBe(false);
    expect(verifyHmac('top-secret', 'payload', '')).toBe(false);
    expect(verifyHmac('top-secret', 'payload', 'not-hex')).toBe(false);
  });
});
