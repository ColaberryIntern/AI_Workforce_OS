import type { PrismaClient, Prisma, Notification } from '@prisma/client';
import type {
  SendNotificationInput,
  ListNotificationsQuery,
  UpdatePreferencesInput,
} from './notifications.schemas.js';
import type { NotificationProvider } from '../../lib/providers/NotificationProvider.js';
import { encrypt, maybeDecrypt } from '../../lib/encryption.js';
import { NotFoundError, TooManyRequestsError } from '../../lib/errors.js';

const PER_USER_RATE_LIMIT = 10;
const PER_USER_RATE_WINDOW_MS = 5 * 60_000;

export class NotificationsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly provider: NotificationProvider,
  ) {}

  /** Enqueue a notification. Returns the row in `pending` state.
   *  The dispatch loop in the worker actually sends. */
  async send(input: SendNotificationInput): Promise<Notification> {
    // Opt-out check
    const pref = await this.findPreference(input.userId, input.channel, input.eventType);
    if (pref && !pref.enabled) {
      return this.create({ ...input, status: 'skipped', lastError: 'OPTED_OUT' });
    }

    // Per-user rate limit
    const since = new Date(Date.now() - PER_USER_RATE_WINDOW_MS);
    const recent = await this.db.notification.count({
      where: { userId: input.userId, createdAt: { gte: since } },
    });
    if (recent >= PER_USER_RATE_LIMIT) {
      return this.create({ ...input, status: 'skipped', lastError: 'RATE_LIMITED' });
    }

    return this.create({ ...input, status: 'pending' });
  }

  list(filter: ListNotificationsQuery, requestingUserId?: string, isAdmin = false) {
    const where: Prisma.NotificationWhereInput = {};
    // Self-only unless admin
    if (!isAdmin && requestingUserId) where.userId = requestingUserId;
    if (filter.userId && (isAdmin || filter.userId === requestingUserId)) where.userId = filter.userId;
    if (filter.status) where.status = filter.status;

    return this.db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
  }

  async getById(id: string, requestingUserId?: string, isAdmin = false) {
    const found = await this.db.notification.findUnique({ where: { id } });
    if (!found) throw new NotFoundError(`Notification ${id} not found`);
    if (!isAdmin && requestingUserId && found.userId !== requestingUserId) {
      throw new NotFoundError(`Notification ${id} not found`); // hide existence
    }
    return { ...found, body: maybeDecrypt(found.body) };
  }

  /** Worker side: pull next pending notifications and dispatch.
   *  Updates status / attempts / sentAt / lastError accordingly. */
  async dispatchPending(batchSize = 10): Promise<{ processed: number; sent: number; failed: number }> {
    const pending = await this.db.notification.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let sent = 0;
    let failed = 0;
    for (const n of pending) {
      // Recipient resolution: in real life lookup the user; for our scaffold
      // we use the user's email as recipient.
      const user = await this.db.user.findUnique({ where: { id: n.userId } });
      const recipient = user?.email ?? '<unknown>';

      const result = await this.provider.send({
        channel: n.channel as 'email' | 'in_app' | 'sms',
        recipient,
        subject: n.subject,
        body: maybeDecrypt(n.body),
        notificationId: n.id,
      });

      if (result.ok) {
        await this.db.notification.update({
          where: { id: n.id },
          data: { status: 'sent', sentAt: new Date(), attempts: n.attempts + 1, lastError: null },
        });
        sent++;
      } else if (result.retryable && n.attempts + 1 < 4) {
        await this.db.notification.update({
          where: { id: n.id },
          data: { attempts: n.attempts + 1, lastError: result.error ?? 'unknown' },
        });
      } else {
        await this.db.notification.update({
          where: { id: n.id },
          data: { status: 'failed', attempts: n.attempts + 1, lastError: result.error ?? 'unknown' },
        });
        failed++;
      }
    }
    return { processed: pending.length, sent, failed };
  }

  async getPreferences(userId: string) {
    return this.db.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ channel: 'asc' }, { eventType: 'asc' }],
    });
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    await this.db.$transaction(async (tx) => {
      for (const p of input.preferences) {
        await tx.notificationPreference.upsert({
          where: {
            userId_channel_eventType: {
              userId,
              channel: p.channel,
              eventType: p.eventType ?? null as unknown as string,
            },
          },
          create: {
            userId,
            channel: p.channel,
            eventType: p.eventType ?? null,
            enabled: p.enabled,
          },
          update: { enabled: p.enabled },
        });
      }
    });
    return this.getPreferences(userId);
  }

  // --- Helpers ---

  private async findPreference(userId: string, channel: string, eventType: string) {
    // Most-specific wins: (channel + eventType) > (channel only)
    const specific = await this.db.notificationPreference.findFirst({
      where: { userId, channel, eventType },
    });
    if (specific) return specific;
    return this.db.notificationPreference.findFirst({
      where: { userId, channel, eventType: null },
    });
  }

  private async create(args: {
    userId: string;
    channel: string;
    eventType: string;
    subject?: string | null;
    body: string;
    status: string;
    lastError?: string;
  }): Promise<Notification> {
    return this.db.notification.create({
      data: {
        userId: args.userId,
        channel: args.channel,
        eventType: args.eventType,
        subject: args.subject ?? null,
        body: encrypt(args.body), // PII at rest per /directives/encryption.md
        status: args.status,
        lastError: args.lastError ?? null,
      },
    });
  }
}
