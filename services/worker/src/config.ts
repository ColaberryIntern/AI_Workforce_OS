import 'dotenv/config';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'aiwos-worker', env: process.env.NODE_ENV ?? 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  TICK_INTERVAL_MS: Number(process.env.TICK_INTERVAL_MS ?? 5_000),
  ALERT_TICK_INTERVAL_MS: Number(process.env.ALERT_TICK_INTERVAL_MS ?? 60_000),
};
