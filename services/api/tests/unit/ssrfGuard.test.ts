import { describe, it, expect } from '@jest/globals';
import { checkOutboundUrl } from '../../src/lib/ssrfGuard.js';

describe('checkOutboundUrl', () => {
  it('accepts an HTTPS URL with a public hostname', () => {
    expect(checkOutboundUrl('https://example.com/hook').ok).toBe(true);
  });

  it('rejects HTTP by default', () => {
    expect(checkOutboundUrl('http://example.com/hook').ok).toBe(false);
  });

  it('allows HTTP when explicitly enabled', () => {
    expect(checkOutboundUrl('http://example.com/hook', { allowHttp: true }).ok).toBe(true);
  });

  it('rejects localhost', () => {
    const r = checkOutboundUrl('https://localhost:9000/x');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/localhost/i);
  });

  it('rejects private IPv4 ranges', () => {
    expect(checkOutboundUrl('https://10.0.0.1/').ok).toBe(false);
    expect(checkOutboundUrl('https://192.168.1.1/').ok).toBe(false);
    expect(checkOutboundUrl('https://172.16.0.1/').ok).toBe(false);
    expect(checkOutboundUrl('https://127.0.0.1/').ok).toBe(false);
    expect(checkOutboundUrl('https://169.254.169.254/').ok).toBe(false);
  });

  it('rejects cloud metadata IP and hostname', () => {
    expect(checkOutboundUrl('https://169.254.169.254/').ok).toBe(false);
    expect(checkOutboundUrl('https://metadata.google.internal/').ok).toBe(false);
  });

  it('rejects malformed URL', () => {
    expect(checkOutboundUrl('not-a-url').ok).toBe(false);
  });

  it('rejects unsupported protocol', () => {
    expect(checkOutboundUrl('ftp://example.com/').ok).toBe(false);
  });

  it('allows private addresses when allowPrivate is true', () => {
    expect(checkOutboundUrl('http://127.0.0.1/', { allowHttp: true, allowPrivate: true }).ok).toBe(true);
  });
});
