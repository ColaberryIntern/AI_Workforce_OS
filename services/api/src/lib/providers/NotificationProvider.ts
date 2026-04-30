import { logger } from '../../config/logger.js';

/**
 * NotificationProvider abstraction. Spec: /directives/notifications.md.
 *
 * The default provider logs to stdout (Console adapter). Real adapters
 * (SendGrid / Postmark / SES / Twilio) implement this interface and plug in
 * via dependency injection — call sites stay unchanged.
 */

export type NotificationChannel = 'email' | 'in_app' | 'sms';

export interface NotificationSendArgs {
  channel: NotificationChannel;
  recipient: string;
  subject: string | null;
  body: string;
  notificationId: string;
}

export interface NotificationSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

export interface NotificationProvider {
  send(args: NotificationSendArgs): Promise<NotificationSendResult>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(args: NotificationSendArgs): Promise<NotificationSendResult> {
    logger.info(
      {
        notificationId: args.notificationId,
        channel: args.channel,
        recipient: args.recipient,
        subject: args.subject,
      },
      `[Notification] ${args.channel} -> ${args.recipient}: ${args.subject ?? '(no subject)'}`,
    );
    return { ok: true, messageId: `console-${args.notificationId}` };
  }
}
