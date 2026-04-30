import { signHmac } from '../hmac.js';
import { checkOutboundUrl } from '../ssrfGuard.js';
import { loadEnv } from '../../config/env.js';

/**
 * Outbound webhook sender. Build Guide §4 #5 + /directives/webhooks.md.
 *
 * - Signs payload with HMAC-SHA256
 * - Adds AIWOS headers (signature / event / delivery / timestamp)
 * - Honors timeout from env
 * - SSRF guard rejects private/loopback in production
 */

export interface WebhookSendArgs {
  url: string;
  secret: string;
  eventType: string;
  deliveryId: string;
  payload: unknown;
}

export interface WebhookSendResult {
  ok: boolean;
  status?: number;
  signature: string;
  error?: string;
  retryable?: boolean;
}

export interface WebhookSender {
  send(args: WebhookSendArgs): Promise<WebhookSendResult>;
}

export class HttpWebhookSender implements WebhookSender {
  async send(args: WebhookSendArgs): Promise<WebhookSendResult> {
    const env = loadEnv();
    const allowHttp = env.NODE_ENV !== 'production';
    const allowPrivate = env.NODE_ENV !== 'production';

    const guard = checkOutboundUrl(args.url, { allowHttp, allowPrivate });
    const body = JSON.stringify({ event: args.eventType, deliveryId: args.deliveryId, payload: args.payload });
    const signature = signHmac(args.secret, body);

    if (!guard.ok) {
      return { ok: false, signature, error: guard.reason ?? 'URL rejected', retryable: false };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), env.WEBHOOK_TIMEOUT_MS);
    try {
      const res = await fetch(args.url, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aiwos-webhook/1.0',
          'X-AIWOS-Event': args.eventType,
          'X-AIWOS-Delivery': args.deliveryId,
          'X-AIWOS-Signature': signature,
          'X-AIWOS-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body,
      });
      clearTimeout(t);
      // 410 Gone → permanent failure (subscriber unsubscribed)
      if (res.status === 410) return { ok: false, status: res.status, signature, error: 'Gone', retryable: false };
      const ok = res.status >= 200 && res.status < 300;
      return {
        ok,
        status: res.status,
        signature,
        error: ok ? undefined : `HTTP ${res.status}`,
        retryable: !ok && res.status >= 500,
      };
    } catch (err) {
      clearTimeout(t);
      const e = err as Error;
      return { ok: false, signature, error: e.message, retryable: true };
    }
  }
}
