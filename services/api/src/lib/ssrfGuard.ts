import { isIP } from 'node:net';

/**
 * Simple SSRF protection for outbound webhook URLs.
 * - Production: reject http (https only), reject private IP ranges + localhost.
 * - Development / test: allow http + localhost so the dev loop works.
 *
 * Spec: /directives/webhooks.md.
 */

export interface SsrfGuardOptions {
  allowHttp?: boolean;
  allowPrivate?: boolean;
}

const PRIVATE_V4_RANGES: Array<[number, number]> = [
  [ip('10.0.0.0'), ip('10.255.255.255')],
  [ip('172.16.0.0'), ip('172.31.255.255')],
  [ip('192.168.0.0'), ip('192.168.255.255')],
  [ip('127.0.0.0'), ip('127.255.255.255')],
  [ip('169.254.0.0'), ip('169.254.255.255')],
  [ip('0.0.0.0'), ip('0.255.255.255')],
];

function ip(addr: string): number {
  return addr.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function isPrivateV4(addr: string): boolean {
  if (isIP(addr) !== 4) return false;
  const n = ip(addr);
  return PRIVATE_V4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

function isPrivateV6(addr: string): boolean {
  if (isIP(addr) !== 6) return false;
  const lower = addr.toLowerCase();
  // Loopback ::1, ULA fc00::/7, link-local fe80::/10
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  );
}

export interface SsrfCheckResult {
  ok: boolean;
  reason?: string;
}

export function checkOutboundUrl(rawUrl: string, opts: SsrfGuardOptions = {}): SsrfCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }

  if (parsed.protocol === 'http:' && !opts.allowHttp) {
    return { ok: false, reason: 'HTTPS is required' };
  }

  const host = parsed.hostname;
  if (!host) return { ok: false, reason: 'Missing host' };

  if (opts.allowPrivate) return { ok: true };

  // Hostname-based blocklist (these always resolve to local/private)
  const lowerHost = host.toLowerCase();
  if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost')) {
    return { ok: false, reason: 'Localhost is not allowed' };
  }
  if (lowerHost === 'metadata.google.internal') {
    return { ok: false, reason: 'Cloud metadata endpoint is not allowed' };
  }

  if (isPrivateV4(host) || isPrivateV6(host)) {
    return { ok: false, reason: 'Private IP range is not allowed' };
  }

  // Cloud metadata IP — AWS / GCP / Azure
  if (host === '169.254.169.254') {
    return { ok: false, reason: 'Cloud metadata IP is not allowed' };
  }

  return { ok: true };
}
