import { describe, it, expect } from '@jest/globals';
import { popularityRecommender } from '../../src/lib/ml/popularityRecommender.js';

describe('popularityRecommender', () => {
  it('returns deterministic output for the same input', () => {
    const input = {
      user: { userId: 'u1', role: 'manager' },
      history: [
        { kind: 'allocation', accepted: true, occurredAt: new Date('2026-04-25T00:00:00Z') },
        { kind: 'reschedule', accepted: false, occurredAt: new Date('2026-04-26T00:00:00Z') },
      ],
      k: 4,
    };
    const a = popularityRecommender(input);
    const b = popularityRecommender(input);
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
  });

  it('cold-start fallback: returns non-empty with low confidence', () => {
    const result = popularityRecommender({ user: { userId: 'u2' }, history: [] });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.coldStart)).toBe(true);
    expect(result.every((r) => r.confidence <= 0.35)).toBe(true);
  });

  it('confidence is in [0, 1]', () => {
    const result = popularityRecommender({
      user: { userId: 'u3' },
      history: Array.from({ length: 20 }, (_, i) => ({
        kind: i % 2 === 0 ? 'allocation' : 'training',
        accepted: i % 3 === 0,
        occurredAt: new Date(Date.now() - i * 86_400_000),
      })),
    });
    for (const r of result) {
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('orders results by confidence desc with stable tiebreaker', () => {
    const result = popularityRecommender({ user: { userId: 'u4' }, history: [] });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });
});
