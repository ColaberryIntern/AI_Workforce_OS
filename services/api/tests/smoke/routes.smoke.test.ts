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
  });

  it('POST /api/services → returns service catalog', async () => {
    const res = await request(app).post('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.services)).toBe(true);
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
