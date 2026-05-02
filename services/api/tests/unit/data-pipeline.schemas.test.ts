import { describe, it, expect } from '@jest/globals';
import { enqueueSchema } from '../../src/domains/data-pipeline/data-pipeline.routes.js';

/**
 * Build Guide §4 #13 §Error Handling — "Invalid raw data sources should
 * return a 400 Bad Request response."
 *
 * The 400 path runs through Zod via the validateBody middleware. These
 * tests exercise the schema directly so the error matrix is locked in.
 */
describe('data-pipeline enqueueSchema', () => {
  it('accepts a valid payload', () => {
    const result = enqueueSchema.safeParse({
      jobType: 'staffing_events',
      sources: ['hris:workday', 's3://bucket/path/file.csv', 'db.public.shifts'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown jobType', () => {
    const result = enqueueSchema.safeParse({
      jobType: 'totally-not-a-real-type',
      sources: ['hris:workday'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('jobType'))).toBe(true);
    }
  });

  it('rejects invalid source format (whitespace, special chars)', () => {
    const bad = enqueueSchema.safeParse({
      jobType: 'custom',
      sources: ['has spaces in it'],
    });
    expect(bad.success).toBe(false);

    const bang = enqueueSchema.safeParse({
      jobType: 'custom',
      sources: ['no!bangs'],
    });
    expect(bang.success).toBe(false);
  });

  it('rejects duplicate source identifiers in the same request', () => {
    const result = enqueueSchema.safeParse({
      jobType: 'analytics_events',
      sources: ['hris:workday', 'hris:workday'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.toLowerCase().includes('duplicate'))).toBe(true);
    }
  });

  it('rejects empty sources array', () => {
    const result = enqueueSchema.safeParse({ jobType: 'custom', sources: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 sources', () => {
    const sources = Array.from({ length: 101 }, (_, i) => `hris:src${i}`);
    const result = enqueueSchema.safeParse({ jobType: 'custom', sources });
    expect(result.success).toBe(false);
  });

  it('rejects a source longer than 200 chars', () => {
    const long = 'a'.repeat(201);
    const result = enqueueSchema.safeParse({ jobType: 'custom', sources: [long] });
    expect(result.success).toBe(false);
  });

  it('accepts the full enum of jobType values', () => {
    const types = [
      'staffing_events',
      'recommendations',
      'forecast_inputs',
      'analytics_events',
      'audit_logs',
      'custom',
    ];
    for (const jobType of types) {
      const result = enqueueSchema.safeParse({ jobType, sources: ['ok-source'] });
      expect(result.success).toBe(true);
    }
  });
});
