/**
 * Jest setup. Forces NODE_ENV=test, populates safe defaults so we never
 * accidentally hit a real DB or send a real network request.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-16-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test';
process.env.LOG_LEVEL = 'silent';
