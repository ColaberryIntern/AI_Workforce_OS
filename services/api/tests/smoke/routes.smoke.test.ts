import { describe, it, expect, jest } from '@jest/globals';

// Mock the Prisma client BEFORE importing the app — none of the smoke tests
// need a real DB; we only verify routing + envelope + auth gates.
jest.mock('../../src/db/prisma.js', () => {
  type AnyAsync = (...args: unknown[]) => Promise<unknown>;
  const fakeClient = {
    $queryRawUnsafe: jest.fn<AnyAsync>().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: jest.fn<AnyAsync>().mockResolvedValue(undefined),
  };
  return {
    getPrisma: () => fakeClient,
    disconnectPrisma: async () => {},
  };
});

import request from 'supertest';
import { createApp } from '../../src/server.js';

const app = createApp();

describe('public routes', () => {
  it('GET /api/health/live → 200 alive', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('alive');
  });

  it('GET /api/health → 200 with mocked DB', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('up');
  });

  it('GET /api/data → returns the API catalog with all surfaces', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.data.surfaces.length).toBeGreaterThanOrEqual(15);
    const areas = res.body.data.surfaces.map((s: { area: string }) => s.area);
    expect(areas).toContain('auth');
    expect(areas).toContain('role-management');
    expect(areas).toContain('value-proposition');
    expect(areas).toContain('recommendations');
    expect(areas).toContain('forecasting');
    expect(areas).toContain('alerting');
    // Project delivery
    expect(areas).toContain('milestones');
    // Subscription / commercial surfaces
    expect(areas).toContain('subscription-tiers');
    expect(areas).toContain('add-ons');
    expect(areas).toContain('events');
    expect(areas).toContain('consulting-services');
    expect(areas).toContain('training-programs');
    expect(areas).toContain('marketing-channels');
    expect(areas).toContain('partnerships');
    expect(areas).toContain('competitor-insights');
    // Build Guide §1 §Competitive Landscape — competitor strengths surface
    const valueProp = res.body.data.surfaces.find(
      (s: { area: string }) => s.area === 'value-proposition',
    );
    const paths = ((valueProp?.endpoints ?? []) as Array<{ path: string }>).map((e) => e.path);
    expect(paths).toContain('/api/competitor-strengths');
    // Build Guide §4 #14 — performance metrics ingest surface
    const perf = res.body.data.surfaces.find(
      (s: { area: string }) => s.area === 'performance-monitoring',
    );
    const perfPaths = ((perf?.endpoints ?? []) as Array<{ path: string }>).map((e) => e.path);
    expect(perfPaths).toContain('/api/performance/metrics');
  });

  it('POST /api/services → returns service catalog', async () => {
    const res = await request(app).post('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.services)).toBe(true);
  });

  it('GET /api/data?area=auth → returns only the auth surface', async () => {
    const res = await request(app).get('/api/data?area=auth');
    expect(res.status).toBe(200);
    expect(res.body.data.surfaces).toHaveLength(1);
    expect(res.body.data.surfaces[0].area).toBe('auth');
    expect(res.body.meta.matched).toBe(1);
  });

  it('GET /api/data?area=nonexistent → 200 with empty surfaces (not 404)', async () => {
    const res = await request(app).get('/api/data?area=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.data.surfaces).toEqual([]);
    expect(res.body.meta.matched).toBe(0);
  });
});

describe('auth gates', () => {
  it('GET /api/roles without auth → 401', async () => {
    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/audit without auth → 401', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login with bad payload → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // --- Subscription / commercial gates ---

  it('GET /api/competitor-insights without auth → 401 (internal endpoint)', async () => {
    const res = await request(app).get('/api/competitor-insights');
    expect(res.status).toBe(401);
  });

  it('GET /api/marketing-channels without auth → 401 (internal endpoint)', async () => {
    const res = await request(app).get('/api/marketing-channels');
    expect(res.status).toBe(401);
  });

  it('GET /api/partnerships without auth → 401 (internal endpoint)', async () => {
    const res = await request(app).get('/api/partnerships');
    expect(res.status).toBe(401);
  });

  it('POST /api/subscription-tiers without auth → 401 (mutation)', async () => {
    const res = await request(app)
      .post('/api/subscription-tiers')
      .send({ key: 'test', name: 'Test', monthlyPriceCents: 100 });
    expect(res.status).toBe(401);
  });

  it('GET /api/milestones without auth → 401', async () => {
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(401);
  });

  it('GET /api/recommendations/feedback-stats without auth → 401', async () => {
    const res = await request(app).get('/api/recommendations/feedback-stats');
    expect(res.status).toBe(401);
  });

  it('POST /api/data/pipeline without auth → 401', async () => {
    const res = await request(app)
      .post('/api/data/pipeline')
      .send({ jobType: 'custom', sources: ['hris:workday'] });
    expect(res.status).toBe(401);
  });

  it('POST /api/performance/metrics without auth → 401', async () => {
    const res = await request(app)
      .post('/api/performance/metrics')
      .send({ service: 'svc', metricName: 'latency_ms_p95', metricValue: 100 });
    expect(res.status).toBe(401);
  });
});

describe('error envelope', () => {
  it('GET /api/nonexistent → 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('all responses use the consistent envelope', async () => {
    const r1 = await request(app).get('/api/health/live');
    const r2 = await request(app).get('/api/nonexistent');
    expect(Object.keys(r1.body)).toEqual(['data']);
    expect(Object.keys(r2.body)).toEqual(['error']);
  });
});
