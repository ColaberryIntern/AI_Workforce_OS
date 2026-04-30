import { Router } from 'express';

import { healthRouter } from '../domains/health/health.routes.js';
import { authRouter } from '../domains/auth/auth.routes.js';
import { rolesRouter } from '../domains/role-management/role-management.routes.js';
import { rbacRouter } from '../domains/rbac/rbac.routes.js';
import { auditRouter } from '../domains/audit-log/audit-log.routes.js';
import { encryptionRouter } from '../domains/encryption/encryption.routes.js';
import {
  valuePropositionsRouter,
  differentiationMatrixRouter,
  competitiveGapsRouter,
} from '../domains/value-proposition/value-proposition.routes.js';
import { apiAccessRouter } from '../domains/api-access/api-access.routes.js';
import { microservicesRouter } from '../domains/microservices/microservices.routes.js';
import { recommenderRouter } from '../domains/recommender/recommender.routes.js';
import { recommendationsRouter } from '../domains/recommendations/recommendations.routes.js';
import { forecastingRouter } from '../domains/forecasting/forecasting.routes.js';
import { notificationsRouter } from '../domains/notifications/notifications.routes.js';
import { webhooksRouter } from '../domains/webhooks/webhooks.routes.js';
import { analyticsRouter } from '../domains/analytics/analytics.routes.js';
import { dataPipelineRouter } from '../domains/data-pipeline/data-pipeline.routes.js';
import { performanceMonitoringRouter } from '../domains/performance-monitoring/performance-monitoring.routes.js';
import { modelMonitoringRouter } from '../domains/model-monitoring/model-monitoring.routes.js';
import { alertingRouter } from '../domains/alerting/alerting.routes.js';
import {
  subscriptionTiersRouter,
  addOnsRouter,
  eventsRouter,
  consultingServicesRouter,
  trainingProgramsRouter,
  marketingChannelsRouter,
  partnershipsRouter,
  competitorInsightsRouter,
} from '../domains/subscription/subscription.routes.js';
import { milestonesRouter } from '../domains/milestones/milestones.routes.js';

/**
 * Top-level API router. Mounts every domain at the Build-Guide-spec path.
 * Order matters where prefixes overlap (e.g. /recommendations/system before
 * /recommendations).
 */
export const rootRouter = Router();

// Operational
rootRouter.use('/health', healthRouter);

// Auth
rootRouter.use('/auth', authRouter);

// Identity & access
rootRouter.use('/roles', rolesRouter);
rootRouter.use('/access', rbacRouter);

// Content
rootRouter.use('/value-propositions', valuePropositionsRouter);
rootRouter.use('/differentiation-matrix', differentiationMatrixRouter);
rootRouter.use('/competitive-gaps', competitiveGapsRouter);

// AI plane (longer prefix first)
rootRouter.use('/recommendations/system', recommenderRouter);
rootRouter.use('/recommendations', recommendationsRouter);
rootRouter.use('/forecast', forecastingRouter);

// Comms
rootRouter.use('/notifications', notificationsRouter);
rootRouter.use('/webhooks', webhooksRouter);

// Generic surfaces
rootRouter.use('/data/pipeline', dataPipelineRouter);
rootRouter.use('/data', apiAccessRouter);

// Analytics
rootRouter.use('/analytics', analyticsRouter);

// Microservices catalog
rootRouter.use('/services', microservicesRouter);

// Encryption utility
rootRouter.use('/encrypt', encryptionRouter);

// Audit
rootRouter.use('/audit', auditRouter);

// Observability
rootRouter.use('/performance', performanceMonitoringRouter);
rootRouter.use('/model/monitor', modelMonitoringRouter);
rootRouter.use('/alerts', alertingRouter);

// Project delivery (Build Guide §10 §Milestone Definitions)
rootRouter.use('/milestones', milestonesRouter);

// Subscription / commercial (Build Guide §1 Business Model + §10 GTM)
rootRouter.use('/subscription-tiers', subscriptionTiersRouter);
rootRouter.use('/add-ons', addOnsRouter);
rootRouter.use('/events', eventsRouter);
rootRouter.use('/consulting-services', consultingServicesRouter);
rootRouter.use('/training-programs', trainingProgramsRouter);
rootRouter.use('/marketing-channels', marketingChannelsRouter);
rootRouter.use('/partnerships', partnershipsRouter);
rootRouter.use('/competitor-insights', competitorInsightsRouter);
