import { Router } from 'express';
import { ok } from '../../lib/envelope.js';

/**
 * Service catalog endpoint. Spec: /directives/microservices.md.
 *
 * Returns the registered services + health URL + version. Pure metadata —
 * a real cross-service router would route via API gateway, not this app.
 */
export const microservicesRouter = Router();

const SERVICES = [
  { name: 'aiwos-api', version: '0.1.0', healthUrl: '/api/health', protocol: 'http' },
  { name: 'aiwos-worker', version: '0.1.0', healthUrl: 'internal://worker/health', protocol: 'internal' },
];

microservicesRouter.post('/', (_req, res) => {
  res.json(ok({ services: SERVICES, count: SERVICES.length }));
});

microservicesRouter.get('/', (_req, res) => {
  res.json(ok({ services: SERVICES, count: SERVICES.length }));
});
