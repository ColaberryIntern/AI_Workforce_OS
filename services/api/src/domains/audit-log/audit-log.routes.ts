import { Router } from 'express';
import { AuditLogService } from './audit-log.service.js';
import { listAuditQuerySchema, appendAuditSchema } from './audit-log.schemas.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

export const auditRouter = Router();

const service = new AuditLogService(getPrisma());

auditRouter.use(requireAuth, requirePermission('audit.read'));

auditRouter.get('/', validateQuery(listAuditQuerySchema), async (req, res) => {
  const result = await service.list(req.query as never);
  res.json(ok(result.items, { nextCursor: result.nextCursor }));
});

auditRouter.post('/', validateBody(appendAuditSchema), async (req, res) => {
  const entry = await service.append(req.user?.userId ?? null, req.body);
  res.status(201).json(ok(entry));
});
