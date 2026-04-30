import type { PrismaClient, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { encrypt, maybeDecrypt } from '../../lib/encryption.js';
import { signHmac } from '../../lib/hmac.js';
import { checkOutboundUrl } from '../../lib/ssrfGuard.js';
import { loadEnv } from '../../config/env.js';
import { BadRequestError, NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';
import type { WebhookCreate, WebhookUpdate } from './webhooks.schemas.js';
import type { WebhookSender } from '../../lib/providers/WebhookSender.js';

const SECRET_BYTES = 32;

export class WebhooksService {
  constructor(
    private readonly db: PrismaClient,
    private readonly sender: WebhookSender,
  ) {}

  async create(input: WebhookCreate) {
    const env = loadEnv();
    const allowHttp = env.NODE_ENV !== 'production';
    const allowPrivate = env.NODE_ENV !== 'production';
    const guard = checkOutboundUrl(input.url, { allowHttp, allowPrivate });
    if (!guard.ok) throw new UnprocessableEntityError(guard.reason ?? 'Invalid URL');

    const secret = randomBytes(SECRET_BYTES).toString('hex');
    const created = await this.db.webhook.create({
      data: {
        url: input.url,
        events: input.events,
        secret: encrypt(secret),
        isActive: input.isActive,
      },
    });
    // Return secret ONCE in plaintext — never again.
    return { ...this.scrub(created), secret };
  }

  async list() {
    const items = await this.db.webhook.findMany({ orderBy: { createdAt: 'desc' } });
    return items.map((w) => this.scrub(w));
  }

  async getById(id: string) {
    const w = await this.db.webhook.findUnique({ where: { id } });
    if (!w) throw new NotFoundError(`Webhook ${id} not found`);
    return this.scrub(w);
  }

  async update(id: string, input: WebhookUpdate) {
    const found = await this.db.webhook.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Webhook ${id} not found`);
    if (input.url) {
      const env = loadEnv();
      const guard = checkOutboundUrl(input.url, {
        allowHttp: env.NODE_ENV !== 'production',
        allowPrivate: env.NODE_ENV !== 'production',
      });
      if (!guard.ok) throw new UnprocessableEntityError(guard.reason ?? 'Invalid URL');
    }
    const updated = await this.db.webhook.update({
      where: { id },
      data: {
        url: input.url ?? undefined,
        events: input.events ?? undefined,
        isActive: input.isActive ?? undefined,
      },
    });
    return this.scrub(updated);
  }

  async delete(id: string) {
    const found = await this.db.webhook.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Webhook ${id} not found`);
    await this.db.webhook.delete({ where: { id } });
  }

  /** Enqueue a synthetic delivery for testing the wire. */
  async enqueueDelivery(webhookId: string, eventType: string, payload: unknown) {
    const w = await this.db.webhook.findUnique({ where: { id: webhookId } });
    if (!w) throw new NotFoundError(`Webhook ${webhookId} not found`);
    if (!w.isActive) throw new BadRequestError('Webhook is disabled');

    const secret = maybeDecrypt(w.secret);
    const body = JSON.stringify({ event: eventType, payload });
    const signature = signHmac(secret, body);

    return this.db.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        signature,
        status: 'pending',
        nextAttemptAt: new Date(),
      },
    });
  }

  async listDeliveries(webhookId: string) {
    return this.db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Worker side: dispatch pending deliveries that are due. Implements the
   *  retry policy: 1s, 4s, 16s backoffs across 4 attempts. */
  async dispatchDue(batchSize = 10) {
    const env = loadEnv();
    const due = await this.db.webhookDelivery.findMany({
      where: {
        status: 'pending',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
      include: { webhook: true },
    });

    let sent = 0;
    let failed = 0;
    for (const d of due) {
      const secret = maybeDecrypt(d.webhook.secret);
      const result = await this.sender.send({
        url: d.webhook.url,
        secret,
        eventType: d.eventType,
        deliveryId: d.id,
        payload: d.payload,
      });

      const attemptNum = d.attempts + 1;
      if (result.ok) {
        await this.db.webhookDelivery.update({
          where: { id: d.id },
          data: {
            status: 'success',
            attempts: attemptNum,
            responseCode: result.status ?? null,
            deliveredAt: new Date(),
            lastError: null,
            nextAttemptAt: null,
          },
        });
        await this.db.webhook.update({
          where: { id: d.webhookId },
          data: { failures: 0 },
        });
        sent++;
      } else if (result.retryable && attemptNum < env.WEBHOOK_MAX_ATTEMPTS) {
        // 1s, 4s, 16s backoff
        const delays = [1_000, 4_000, 16_000];
        const delay = delays[Math.min(attemptNum - 1, delays.length - 1)];
        await this.db.webhookDelivery.update({
          where: { id: d.id },
          data: {
            attempts: attemptNum,
            responseCode: result.status ?? null,
            lastError: result.error ?? null,
            nextAttemptAt: new Date(Date.now() + delay),
          },
        });
      } else {
        await this.db.webhookDelivery.update({
          where: { id: d.id },
          data: {
            status: 'failed',
            attempts: attemptNum,
            responseCode: result.status ?? null,
            lastError: result.error ?? null,
            nextAttemptAt: null,
          },
        });
        const updated = await this.db.webhook.update({
          where: { id: d.webhookId },
          data: { failures: { increment: 1 } },
        });
        // Auto-disable after 24 consecutive failures
        if (updated.failures >= 24) {
          await this.db.webhook.update({
            where: { id: d.webhookId },
            data: { isActive: false, disabledAt: new Date() },
          });
        }
        failed++;
      }
    }
    return { processed: due.length, sent, failed };
  }

  private scrub<T extends { secret: string }>(w: T): Omit<T, 'secret'> {
    const { secret: _secret, ...rest } = w;
    return rest;
  }
}
