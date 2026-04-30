import 'express-async-errors';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rootRouter } from './routes/index.js';
import { fail } from './lib/envelope.js';

/**
 * Express app factory. Separated so tests build the app without binding a port.
 * Spec: Build Guide §6 (NFRs), §7 (architecture), §8 (security).
 */
export function createApp(): Express {
  const env = loadEnv();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  // Global rate limit (Build Guide §6 #2 + §8 DoS mitigation)
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api', rootRouter);

  app.use((_req, res) => {
    res.status(404).json(fail('NOT_FOUND', 'Route not found'));
  });

  app.use(errorHandler);

  return app;
}
