import { Router } from 'express';
import { WebhooksService } from './webhooks.service.js';
import {
  webhookCreateSchema,
  webhookUpdateSchema,
  idParamSchema,
  triggerTestSchema,
} from './webhooks.schemas.js';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { HttpWebhookSender } from '../../lib/providers/WebhookSender.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/webhooks.md */
export const webhooksRouter = Router();

const service = new WebhooksService(getPrisma(), new HttpWebhookSender());

webhooksRouter.use(requireAuth);

webhooksRouter.get('/', requirePermission('webhook.read'), async (_req, res) => {
  const items = await service.list();
  res.json(ok(items, { count: items.length }));
});

webhooksRouter.get(
  '/:id',
  requirePermission('webhook.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const item = await service.getById((req.params as { id: string }).id);
    res.json(ok(item));
  },
);

webhooksRouter.post(
  '/',
  requirePermission('webhook.write'),
  validateBody(webhookCreateSchema),
  audit('webhook.create', (req) => `webhook:${(req.body as { url: string }).url}`),
  async (req, res) => {
    const created = await service.create(req.body);
    res.status(201).json(ok(created));
  },
);

webhooksRouter.patch(
  '/:id',
  requirePermission('webhook.write'),
  validateParams(idParamSchema),
  validateBody(webhookUpdateSchema),
  audit('webhook.update', (req) => `webhook:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.update((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

webhooksRouter.delete(
  '/:id',
  requirePermission('webhook.write'),
  validateParams(idParamSchema),
  audit('webhook.delete', (req) => `webhook:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.delete((req.params as { id: string }).id);
    res.status(204).send();
  },
);

webhooksRouter.post(
  '/:id/test',
  requirePermission('webhook.write'),
  validateParams(idParamSchema),
  validateBody(triggerTestSchema),
  audit('webhook.test', (req) => `webhook:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const id = (req.params as { id: string }).id;
    const { eventType, payload } = req.body as { eventType: string; payload: unknown };
    const delivery = await service.enqueueDelivery(id, eventType, payload);
    res.status(201).json(ok(delivery));
  },
);

webhooksRouter.get(
  '/:id/deliveries',
  requirePermission('webhook.read'),
  validateParams(idParamSchema),
  async (req, res) => {
    const items = await service.listDeliveries((req.params as { id: string }).id);
    res.json(ok(items, { count: items.length }));
  },
);
