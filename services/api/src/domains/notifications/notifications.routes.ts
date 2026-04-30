import { Router } from 'express';
import { NotificationsService } from './notifications.service.js';
import {
  sendNotificationSchema,
  listNotificationsQuerySchema,
  idParamSchema,
  updatePreferencesSchema,
} from './notifications.schemas.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ConsoleNotificationProvider } from '../../lib/providers/NotificationProvider.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/notifications.md */
export const notificationsRouter = Router();

const service = new NotificationsService(getPrisma(), new ConsoleNotificationProvider());

notificationsRouter.use(requireAuth);

// Preferences must come BEFORE /:id so /preferences doesn't get caught by it.
notificationsRouter.get('/preferences', async (req, res) => {
  const prefs = await service.getPreferences(req.user!.userId);
  res.json(ok(prefs));
});

notificationsRouter.put(
  '/preferences',
  validateBody(updatePreferencesSchema),
  audit('notification.preferences.update', (req) => `user:${req.user!.userId}`),
  async (req, res) => {
    const updated = await service.updatePreferences(req.user!.userId, req.body);
    res.json(ok(updated));
  },
);

notificationsRouter.get(
  '/',
  validateQuery(listNotificationsQuerySchema),
  async (req, res) => {
    const isAdmin = (req.user!.permissions ?? []).includes('notification.read');
    const items = await service.list(req.query as never, req.user!.userId, isAdmin);
    res.json(ok(items, { count: items.length }));
  },
);

notificationsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const isAdmin = (req.user!.permissions ?? []).includes('notification.read');
  const item = await service.getById((req.params as { id: string }).id, req.user!.userId, isAdmin);
  res.json(ok(item));
});

notificationsRouter.post(
  '/',
  requirePermission('notification.write'),
  validateBody(sendNotificationSchema),
  audit('notification.send', (req) => `user:${(req.body as { userId: string }).userId}`),
  async (req, res) => {
    const created = await service.send(req.body);
    res.status(201).json(ok(created));
  },
);
