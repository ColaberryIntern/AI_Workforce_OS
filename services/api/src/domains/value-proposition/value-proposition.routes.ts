import { Router } from 'express';
import { ValuePropositionService } from './value-proposition.service.js';
import {
  valuePropCreateSchema,
  valuePropUpdateSchema,
  valuePropListQuerySchema,
  idParamSchema,
  matrixCellUpsertSchema,
  matrixCellParamSchema,
  competitiveGapCreateSchema,
  competitiveGapUpdateSchema,
} from './value-proposition.schemas.js';
import { validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { audit } from '../../middleware/auditLog.js';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';

/** Spec: /directives/value_proposition.md */
export const valuePropositionsRouter = Router();
export const differentiationMatrixRouter = Router();
export const competitiveGapsRouter = Router();

const service = new ValuePropositionService(getPrisma());

// --- Value propositions ---

valuePropositionsRouter.get('/', validateQuery(valuePropListQuerySchema), async (req, res) => {
  const items = await service.list(req.query as never);
  res.json(ok(items, { count: items.length }));
});

valuePropositionsRouter.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const item = await service.getById((req.params as { id: string }).id);
  res.json(ok(item));
});

valuePropositionsRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(valuePropCreateSchema),
  audit('value_proposition.create', (req) => `value_proposition:${(req.body as { title: string }).title}`),
  async (req, res) => {
    const created = await service.create(req.body);
    res.status(201).json(ok(created));
  },
);

valuePropositionsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(valuePropUpdateSchema),
  audit('value_proposition.update', (req) => `value_proposition:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.update((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

valuePropositionsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('value_proposition.delete', (req) => `value_proposition:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.delete((req.params as { id: string }).id);
    res.status(204).send();
  },
);

// --- Differentiation matrix ---

differentiationMatrixRouter.get('/', async (_req, res) => {
  const matrix = await service.getMatrix();
  res.json(ok(matrix));
});

differentiationMatrixRouter.put(
  '/cells/:capabilityId/:competitorId',
  requireAuth,
  requirePermission('content.write'),
  validateParams(matrixCellParamSchema),
  validateBody(matrixCellUpsertSchema),
  audit('matrix_cell.upsert', (req) => {
    const p = req.params as { capabilityId: string; competitorId: string };
    return `matrix_cell:${p.capabilityId}:${p.competitorId}`;
  }),
  async (req, res) => {
    const { capabilityId, competitorId } = req.params as {
      capabilityId: string;
      competitorId: string;
    };
    const cell = await service.upsertCell(capabilityId, competitorId, req.body);
    res.json(ok(cell));
  },
);

// --- Competitive gaps ---

competitiveGapsRouter.get('/', async (_req, res) => {
  const items = await service.listGaps();
  res.json(ok(items, { count: items.length }));
});

competitiveGapsRouter.post(
  '/',
  requireAuth,
  requirePermission('content.write'),
  validateBody(competitiveGapCreateSchema),
  audit('competitive_gap.create', (req) => `competitive_gap:${(req.body as { title: string }).title}`),
  async (req, res) => {
    const created = await service.createGap(req.body);
    res.status(201).json(ok(created));
  },
);

competitiveGapsRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  validateBody(competitiveGapUpdateSchema),
  audit('competitive_gap.update', (req) => `competitive_gap:${(req.params as { id: string }).id}`),
  async (req, res) => {
    const updated = await service.updateGap((req.params as { id: string }).id, req.body);
    res.json(ok(updated));
  },
);

competitiveGapsRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('content.write'),
  validateParams(idParamSchema),
  audit('competitive_gap.delete', (req) => `competitive_gap:${(req.params as { id: string }).id}`),
  async (req, res) => {
    await service.deleteGap((req.params as { id: string }).id);
    res.status(204).send();
  },
);
