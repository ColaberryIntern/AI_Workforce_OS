import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '../config/logger.js';

/**
 * Request logger. Adds a request ID; logs method, path, status, duration.
 * Spec: /directives/observability.md.
 */
export const requestLogger = pinoHttp({
  logger,
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err: Error | undefined,
  ) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
    `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) =>
    `${req.method} ${req.url} ${res.statusCode} ${err.message}`,
  serializers: {
    req: (req: IncomingMessage & { id?: string; remoteAddress?: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
  },
});
