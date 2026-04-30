import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment configuration. Validated at boot via Zod so the process fails
 * fast on misconfiguration rather than producing confusing runtime errors.
 *
 * Spec: Build Guide §7 Environment Configuration; CLAUDE.md determinism principle.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(14),

  ENCRYPTION_KEY: z.string().optional(),

  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(4),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;

  if (process.env.NODE_ENV === 'test') {
    process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  if (parsed.data.NODE_ENV === 'production' && !parsed.data.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in production');
  }

  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
