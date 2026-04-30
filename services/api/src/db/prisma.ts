import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Prisma client singleton. Lazy so tests can mock the export.
 */
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (client) return client;
  const env = loadEnv();
  client = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
    logger.info('Prisma client disconnected');
  }
}
