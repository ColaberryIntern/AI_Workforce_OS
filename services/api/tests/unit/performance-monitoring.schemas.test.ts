import { describe, it, expect } from '@jest/globals';
import { ingestMetricSchema } from '../../src/domains/performance-monitoring/performance-monitoring.routes.js';

/**
 * Build Guide §4 #14 §Error Handling — "Invalid metrics input should
 * return a 400 Bad Request response."
 */
describe('performance-monitoring ingestMetricSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = ingestMetricSchema.safeParse({
      service: 'aiwos-api',
      metricName: 'latency_ms_p95',
      metricValue: 145.7,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload with optional fields', () => {
    const result = ingestMetricSchema.safeParse({
      service: 'aiwos-api',
      endpoint: '/api/recommendations',
      metricName: 'latency_ms_p95',
      metricValue: 0,
      labels: { region: 'us-east-1', deploy: 'v0.1.0' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing service', () => {
    const result = ingestMetricSchema.safeParse({
      metricName: 'latency_ms_p95',
      metricValue: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing metricName', () => {
    const result = ingestMetricSchema.safeParse({
      service: 'svc',
      metricValue: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty service or metricName', () => {
    expect(
      ingestMetricSchema.safeParse({ service: '', metricName: 'm', metricValue: 1 }).success,
    ).toBe(false);
    expect(
      ingestMetricSchema.safeParse({ service: 's', metricName: '', metricValue: 1 }).success,
    ).toBe(false);
  });

  it('rejects non-finite metricValue (NaN, Infinity)', () => {
    const nan = ingestMetricSchema.safeParse({ service: 's', metricName: 'm', metricValue: NaN });
    expect(nan.success).toBe(false);
    const inf = ingestMetricSchema.safeParse({ service: 's', metricName: 'm', metricValue: Infinity });
    expect(inf.success).toBe(false);
  });

  it('rejects non-number metricValue', () => {
    const result = ingestMetricSchema.safeParse({
      service: 's',
      metricName: 'm',
      metricValue: '100',
    });
    expect(result.success).toBe(false);
  });

  it('rejects over-long fields', () => {
    const longService = ingestMetricSchema.safeParse({
      service: 'a'.repeat(121),
      metricName: 'm',
      metricValue: 1,
    });
    expect(longService.success).toBe(false);
    const longMetric = ingestMetricSchema.safeParse({
      service: 's',
      metricName: 'm'.repeat(121),
      metricValue: 1,
    });
    expect(longMetric.success).toBe(false);
  });
});
