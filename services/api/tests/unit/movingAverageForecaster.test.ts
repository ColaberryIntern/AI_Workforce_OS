import { describe, it, expect } from '@jest/globals';
import {
  movingAverageForecaster,
  InsufficientHistoryError,
} from '../../src/lib/ml/movingAverageForecaster.js';

function syntheticSeries(n: number, base: number, slope: number, noise: number): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, 0, i + 1);
    const v = base + slope * i + (i % 7 === 0 ? noise : -noise * 0.5);
    out.push({ date: d.toISOString().slice(0, 10), value: v });
  }
  return out;
}

describe('movingAverageForecaster', () => {
  it('throws InsufficientHistoryError when series is too short', () => {
    expect(() =>
      movingAverageForecaster({ series: [{ date: '2026-01-01', value: 10 }], horizonDays: 5 }),
    ).toThrow(InsufficientHistoryError);
  });

  it('produces a forecast with horizonDays points', () => {
    const result = movingAverageForecaster({ series: syntheticSeries(60, 100, 0.5, 5), horizonDays: 14 });
    expect(result.forecast).toHaveLength(14);
    expect(result.ciLower).toHaveLength(14);
    expect(result.ciUpper).toHaveLength(14);
  });

  it('CI bounds bracket the point estimate', () => {
    const result = movingAverageForecaster({ series: syntheticSeries(60, 100, 0.5, 5), horizonDays: 7 });
    for (let i = 0; i < result.forecast.length; i++) {
      expect(result.ciLower[i].value).toBeLessThanOrEqual(result.forecast[i].value);
      expect(result.ciUpper[i].value).toBeGreaterThanOrEqual(result.forecast[i].value);
    }
  });

  it('determinism: same input → same output', () => {
    const series = syntheticSeries(60, 100, 0.5, 5);
    const a = movingAverageForecaster({ series, horizonDays: 7 });
    const b = movingAverageForecaster({ series, horizonDays: 7 });
    expect(a).toEqual(b);
  });

  it('emits modelName and modelVersion', () => {
    const r = movingAverageForecaster({ series: syntheticSeries(30, 50, 0, 0), horizonDays: 1 });
    expect(r.modelName).toBe('moving-average-baseline');
    expect(r.modelVersion).toBe('1.0.0');
  });
});
