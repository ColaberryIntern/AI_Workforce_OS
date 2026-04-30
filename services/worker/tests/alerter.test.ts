import { describe, it, expect, jest } from '@jest/globals';
import { Alerter } from '../src/alerter/runner.js';
import type { PrismaClient } from '@prisma/client';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('Alerter', () => {
  it('creates an alert when an APM rule is breached', async () => {
    const rule = {
      id: 'r1',
      name: 'p95 latency over 200ms',
      source: 'apm',
      metric: 'latency_ms_p95',
      operator: 'gt',
      threshold: 200,
      windowSecs: 300,
      severity: 'warning',
      isActive: true,
    };
    const created: unknown[] = [];
    const db = {
      alertRule: { findMany: jest.fn<AnyAsync>().mockResolvedValue([rule]) },
      perfMetric: {
        findMany: jest.fn<AnyAsync>().mockResolvedValue([
          { metricName: 'latency_ms_p95', metricValue: 250, recordedAt: new Date() },
          { metricName: 'latency_ms_p95', metricValue: 210, recordedAt: new Date() },
        ]),
      },
      modelMetric: { findMany: jest.fn<AnyAsync>() },
      alert: {
        findFirst: jest.fn<AnyAsync>().mockResolvedValue(null),
        create: jest.fn<AnyAsync>().mockImplementation((async (args: { data: unknown }) => {
          created.push(args.data);
          return args.data;
        }) as AnyAsync),
      },
    } as unknown as PrismaClient;

    const alerter = new Alerter(db);
    const r = await alerter.tick();
    expect(r.rulesEvaluated).toBe(1);
    expect(r.alertsCreated).toBe(1);
    expect((created[0] as { severity: string }).severity).toBe('warning');
  });

  it('does not duplicate when an open alert already exists for the rule', async () => {
    const rule = {
      id: 'r2',
      name: 'too-low accuracy',
      source: 'model',
      metric: 'accuracy',
      operator: 'lt',
      threshold: 0.7,
      windowSecs: 600,
      severity: 'critical',
      isActive: true,
    };
    const db = {
      alertRule: { findMany: jest.fn<AnyAsync>().mockResolvedValue([rule]) },
      modelMetric: {
        findMany: jest.fn<AnyAsync>().mockResolvedValue([
          { metricName: 'accuracy', metricValue: 0.6, recordedAt: new Date() },
        ]),
      },
      perfMetric: { findMany: jest.fn<AnyAsync>() },
      alert: {
        findFirst: jest.fn<AnyAsync>().mockResolvedValue({ id: 'existing' }),
        create: jest.fn<AnyAsync>(),
      },
    } as unknown as PrismaClient;

    const alerter = new Alerter(db);
    const r = await alerter.tick();
    expect(r.alertsCreated).toBe(0);
  });

  it('returns 0 alerts when no rules are active', async () => {
    const db = {
      alertRule: { findMany: jest.fn<AnyAsync>().mockResolvedValue([]) },
      perfMetric: { findMany: jest.fn<AnyAsync>() },
      modelMetric: { findMany: jest.fn<AnyAsync>() },
      alert: { findFirst: jest.fn<AnyAsync>(), create: jest.fn<AnyAsync>() },
    } as unknown as PrismaClient;
    const r = await new Alerter(db).tick();
    expect(r).toEqual({ rulesEvaluated: 0, alertsCreated: 0 });
  });
});
