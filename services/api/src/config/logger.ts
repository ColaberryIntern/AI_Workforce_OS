import pino from 'pino';
import { loadEnv } from './env.js';

/**
 * Structured JSON logger. Build Guide §6 Monitoring + ch.8 audit logging.
 * No PII at info level. Sensitive headers/fields redacted at the logger level.
 */
const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'aiwos-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
