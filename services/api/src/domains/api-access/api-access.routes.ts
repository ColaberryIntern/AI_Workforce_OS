import { Router } from 'express';
import { ok } from '../../lib/envelope.js';

/**
 * API catalog endpoint. Spec: /directives/api_access.md.
 *
 * Returns a self-describing list of every public surface the API exposes —
 * useful for third-party integrations and SDK generators.
 */
export const apiAccessRouter = Router();

const CATALOG = {
  apiVersion: 'v1',
  baseUrl: '/api',
  surfaces: [
    {
      area: 'auth',
      directive: '/directives/auth.md',
      endpoints: [
        { method: 'POST', path: '/api/auth/register', auth: 'public' },
        { method: 'POST', path: '/api/auth/login', auth: 'public' },
        { method: 'POST', path: '/api/auth/refresh', auth: 'public' },
        { method: 'POST', path: '/api/auth/logout', auth: 'requireAuth' },
        { method: 'GET', path: '/api/auth/me', auth: 'requireAuth' },
        { method: 'POST', path: '/api/auth/change-password', auth: 'requireAuth' },
      ],
    },
    {
      area: 'role-management',
      directive: '/directives/role_management.md',
      endpoints: [
        { method: 'GET', path: '/api/roles', auth: 'role.read' },
        { method: 'POST', path: '/api/roles', auth: 'role.write' },
        { method: 'GET', path: '/api/roles/:id', auth: 'role.read' },
        { method: 'PATCH', path: '/api/roles/:id', auth: 'role.write' },
        { method: 'DELETE', path: '/api/roles/:id', auth: 'role.write' },
        { method: 'POST', path: '/api/roles/assignments', auth: 'role.assign' },
        { method: 'DELETE', path: '/api/roles/assignments/:userId/:roleId', auth: 'role.assign' },
        { method: 'PUT', path: '/api/roles/:id/permissions', auth: 'permission.write' },
      ],
    },
    {
      area: 'rbac',
      directive: '/directives/rbac.md',
      endpoints: [{ method: 'POST', path: '/api/access', auth: 'permission.write' }],
    },
    {
      area: 'audit',
      directive: '/directives/audit_logging.md',
      endpoints: [
        { method: 'GET', path: '/api/audit', auth: 'audit.read' },
        { method: 'POST', path: '/api/audit', auth: 'audit.read' },
      ],
    },
    {
      area: 'encryption',
      directive: '/directives/encryption.md',
      endpoints: [{ method: 'POST', path: '/api/encrypt', auth: 'admin' }],
    },
    {
      area: 'value-proposition',
      directive: '/directives/value_proposition.md',
      endpoints: [
        { method: 'GET', path: '/api/value-propositions', auth: 'public' },
        { method: 'GET', path: '/api/value-propositions/:id', auth: 'public' },
        { method: 'POST', path: '/api/value-propositions', auth: 'content.write' },
        { method: 'PATCH', path: '/api/value-propositions/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/value-propositions/:id', auth: 'content.write' },
        { method: 'GET', path: '/api/differentiation-matrix', auth: 'public' },
        {
          method: 'PUT',
          path: '/api/differentiation-matrix/cells/:capabilityId/:competitorId',
          auth: 'content.write',
        },
        { method: 'GET', path: '/api/competitive-gaps', auth: 'public' },
        { method: 'POST', path: '/api/competitive-gaps', auth: 'content.write' },
        { method: 'PATCH', path: '/api/competitive-gaps/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/competitive-gaps/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'recommendations',
      directive: '/directives/ai_recommendations.md',
      endpoints: [
        { method: 'POST', path: '/api/recommendations', auth: 'recommendation.read' },
        { method: 'GET', path: '/api/recommendations', auth: 'recommendation.read' },
        { method: 'GET', path: '/api/recommendations/:id', auth: 'recommendation.read' },
        { method: 'POST', path: '/api/recommendations/:id/accept', auth: 'recommendation.write' },
        { method: 'POST', path: '/api/recommendations/:id/reject', auth: 'recommendation.write' },
        { method: 'POST', path: '/api/recommendations/system', auth: 'recommendation.read' },
      ],
    },
    {
      area: 'forecasting',
      directive: '/directives/time_series_forecasting.md',
      endpoints: [
        { method: 'POST', path: '/api/forecast', auth: 'forecast.write' },
        { method: 'GET', path: '/api/forecast/:id', auth: 'forecast.read' },
      ],
    },
    {
      area: 'notifications',
      directive: '/directives/notifications.md',
      endpoints: [
        { method: 'POST', path: '/api/notifications', auth: 'notification.write' },
        { method: 'GET', path: '/api/notifications', auth: 'notification.read' },
        { method: 'GET', path: '/api/notifications/:id', auth: 'notification.read' },
        { method: 'GET', path: '/api/notifications/preferences', auth: 'requireAuth' },
        { method: 'PUT', path: '/api/notifications/preferences', auth: 'requireAuth' },
      ],
    },
    {
      area: 'webhooks',
      directive: '/directives/webhooks.md',
      endpoints: [
        { method: 'POST', path: '/api/webhooks', auth: 'webhook.write' },
        { method: 'GET', path: '/api/webhooks', auth: 'webhook.read' },
        { method: 'GET', path: '/api/webhooks/:id', auth: 'webhook.read' },
        { method: 'PATCH', path: '/api/webhooks/:id', auth: 'webhook.write' },
        { method: 'DELETE', path: '/api/webhooks/:id', auth: 'webhook.write' },
        { method: 'POST', path: '/api/webhooks/:id/test', auth: 'webhook.write' },
        { method: 'GET', path: '/api/webhooks/:id/deliveries', auth: 'webhook.read' },
      ],
    },
    {
      area: 'analytics',
      directive: '/directives/usage_analytics.md',
      endpoints: [
        { method: 'POST', path: '/api/analytics', auth: 'analytics.write' },
        { method: 'GET', path: '/api/analytics', auth: 'analytics.read' },
        { method: 'GET', path: '/api/analytics/summary', auth: 'analytics.read' },
      ],
    },
    {
      area: 'data-pipeline',
      directive: '/directives/data_pipeline.md',
      endpoints: [
        { method: 'POST', path: '/api/data/pipeline', auth: 'pipeline.run' },
        { method: 'GET', path: '/api/data/pipeline', auth: 'pipeline.run' },
        { method: 'GET', path: '/api/data/pipeline/:id', auth: 'pipeline.run' },
      ],
    },
    {
      area: 'performance-monitoring',
      directive: '/directives/performance_monitoring.md',
      endpoints: [{ method: 'GET', path: '/api/performance', auth: 'monitoring.read' }],
    },
    {
      area: 'model-monitoring',
      directive: '/directives/ai_model_monitoring.md',
      endpoints: [
        { method: 'POST', path: '/api/model/monitor', auth: 'monitoring.read' },
        { method: 'GET', path: '/api/model/monitor', auth: 'monitoring.read' },
      ],
    },
    {
      area: 'alerting',
      directive: '/directives/alerting_system.md',
      endpoints: [
        { method: 'GET', path: '/api/alerts', auth: 'monitoring.read' },
        { method: 'POST', path: '/api/alerts/rules', auth: 'alert.write' },
        { method: 'GET', path: '/api/alerts/rules', auth: 'alert.write' },
        { method: 'PATCH', path: '/api/alerts/rules/:id', auth: 'alert.write' },
        { method: 'DELETE', path: '/api/alerts/rules/:id', auth: 'alert.write' },
        { method: 'POST', path: '/api/alerts/:id/acknowledge', auth: 'monitoring.read' },
        { method: 'POST', path: '/api/alerts/:id/resolve', auth: 'monitoring.read' },
      ],
    },
    {
      area: 'microservices',
      directive: '/directives/microservices.md',
      endpoints: [{ method: 'POST', path: '/api/services', auth: 'public' }],
    },
    {
      area: 'health',
      directive: '/directives/observability.md',
      endpoints: [
        { method: 'GET', path: '/api/health', auth: 'public' },
        { method: 'GET', path: '/api/health/live', auth: 'public' },
        { method: 'GET', path: '/api/health/ready', auth: 'public' },
      ],
    },
    {
      area: 'subscription-tiers',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/subscription-tiers', auth: 'public' },
        { method: 'GET', path: '/api/subscription-tiers/:id', auth: 'public' },
        { method: 'POST', path: '/api/subscription-tiers', auth: 'content.write' },
        { method: 'PATCH', path: '/api/subscription-tiers/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/subscription-tiers/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'add-ons',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/add-ons', auth: 'public' },
        { method: 'GET', path: '/api/add-ons/:id', auth: 'public' },
        { method: 'POST', path: '/api/add-ons', auth: 'content.write' },
        { method: 'PATCH', path: '/api/add-ons/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/add-ons/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'events',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/events', auth: 'public' },
        { method: 'GET', path: '/api/events/:id', auth: 'public' },
        { method: 'POST', path: '/api/events', auth: 'content.write' },
        { method: 'PATCH', path: '/api/events/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/events/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'consulting-services',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/consulting-services', auth: 'public' },
        { method: 'GET', path: '/api/consulting-services/:id', auth: 'public' },
        { method: 'POST', path: '/api/consulting-services', auth: 'content.write' },
        { method: 'PATCH', path: '/api/consulting-services/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/consulting-services/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'training-programs',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/training-programs', auth: 'public' },
        { method: 'GET', path: '/api/training-programs/:id', auth: 'public' },
        { method: 'POST', path: '/api/training-programs', auth: 'content.write' },
        { method: 'PATCH', path: '/api/training-programs/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/training-programs/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'marketing-channels',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/marketing-channels', auth: 'requireAuth' },
        { method: 'GET', path: '/api/marketing-channels/:id', auth: 'requireAuth' },
        { method: 'POST', path: '/api/marketing-channels', auth: 'content.write' },
        { method: 'PATCH', path: '/api/marketing-channels/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/marketing-channels/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'partnerships',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/partnerships', auth: 'requireAuth' },
        { method: 'GET', path: '/api/partnerships/:id', auth: 'requireAuth' },
        { method: 'POST', path: '/api/partnerships', auth: 'content.write' },
        { method: 'PATCH', path: '/api/partnerships/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/partnerships/:id', auth: 'content.write' },
      ],
    },
    {
      area: 'competitor-insights',
      directive: '/directives/subscription_tiers.md',
      endpoints: [
        { method: 'GET', path: '/api/competitor-insights', auth: 'requireAuth' },
        { method: 'GET', path: '/api/competitor-insights/:id', auth: 'requireAuth' },
        { method: 'POST', path: '/api/competitor-insights', auth: 'content.write' },
        { method: 'PATCH', path: '/api/competitor-insights/:id', auth: 'content.write' },
        { method: 'DELETE', path: '/api/competitor-insights/:id', auth: 'content.write' },
      ],
    },
  ],
};

apiAccessRouter.get('/', (_req, res) => {
  res.json(ok(CATALOG));
});
