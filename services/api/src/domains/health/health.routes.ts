import { Router } from 'express';
import { getPrisma } from '../../db/prisma.js';
import { ok } from '../../lib/envelope.js';
import { logger } from '../../config/logger.js';

/**
 * Liveness + readiness probes. Build Guide §6 §Availability.
 */
export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const startedAt = Date.now();
  let dbStatus: 'up' | 'down' = 'up';
  try {
    await getPrisma().$queryRawUnsafe('SELECT 1');
  } catch (err) {
    logger.warn({ err }, 'Health check: DB ping failed');
    dbStatus = 'down';
  }

  res.json(
    ok({
      status: dbStatus === 'up' ? 'healthy' : 'degraded',
      db: dbStatus,
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      checkLatencyMs: Date.now() - startedAt,
    }),
  );
});

healthRouter.get('/live', (_req, res) => {
  res.json(ok({ status: 'alive', uptimeSeconds: Math.round(process.uptime()) }));
});

healthRouter.get('/ready', async (_req, res) => {
  let ready = true;
  try {
    await getPrisma().$queryRawUnsafe('SELECT 1');
  } catch {
    ready = false;
  }
  res.status(ready ? 200 : 503).json(ok({ ready }));
});
