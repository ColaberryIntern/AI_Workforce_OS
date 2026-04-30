/**
 * Worker entry point. Spawns the periodic loops:
 *   - Notification dispatch (every TICK_INTERVAL_MS)
 *   - Webhook delivery (every TICK_INTERVAL_MS)
 *   - ETL runner (every TICK_INTERVAL_MS)
 *   - Alerter (every ALERT_TICK_INTERVAL_MS)
 *
 * Each loop is best-effort: a failed tick logs an error and the next tick
 * proceeds normally. Graceful shutdown on SIGTERM / SIGINT.
 */

import { PrismaClient } from '@prisma/client';
import { logger, env } from './config.js';
import { EtlRunner, StubFetcher } from './etl/runner.js';
import { Alerter } from './alerter/runner.js';

const prisma = new PrismaClient();
const etlRunner = new EtlRunner(prisma, new StubFetcher());
const alerter = new Alerter(prisma);

let stopping = false;

async function loop(name: string, intervalMs: number, tick: () => Promise<unknown>): Promise<void> {
  while (!stopping) {
    try {
      await tick();
    } catch (err) {
      logger.error({ err, loop: name }, `[${name}] tick failed`);
    }
    if (stopping) break;
    await sleep(intervalMs);
  }
  logger.info({ loop: name }, `[${name}] loop stopped`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Worker shutting down');
  stopping = true;
  await prisma.$disconnect();
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info({ env: env.NODE_ENV }, 'Worker starting');

// Run loops concurrently
void Promise.all([
  loop('etl', env.TICK_INTERVAL_MS, () => etlRunner.runDue()),
  loop('alerter', env.ALERT_TICK_INTERVAL_MS, () => alerter.tick()),
]);
