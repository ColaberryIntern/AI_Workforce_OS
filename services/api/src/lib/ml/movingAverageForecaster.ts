/**
 * Deterministic moving-average + linear-trend forecaster.
 * Spec: /directives/time_series_forecasting.md.
 *
 * Pure function. Approximates Prophet/ARIMA at very low cost — used until
 * the real ML provider is in place.
 */

export interface ForecastInput {
  series: Array<{ date: string; value: number }>;
  horizonDays: number;
}

export interface ForecastResult {
  forecast: Array<{ date: string; value: number }>;
  ciLower: Array<{ date: string; value: number }>;
  ciUpper: Array<{ date: string; value: number }>;
  modelName: string;
  modelVersion: string;
  warning?: string;
}

const MODEL_NAME = 'moving-average-baseline';
const MODEL_VERSION = '1.0.0';
const MIN_HISTORY = 14;

export class InsufficientHistoryError extends Error {
  readonly code = 'INSUFFICIENT_HISTORY';
  constructor(public readonly have: number, public readonly need: number) {
    super(`Need at least ${need} historical points; have ${have}`);
  }
}

export function movingAverageForecaster(input: ForecastInput): ForecastResult {
  const n = input.series.length;
  if (n < MIN_HISTORY) throw new InsufficientHistoryError(n, MIN_HISTORY);
  if (input.horizonDays < 1 || input.horizonDays > 365) {
    throw new Error('horizonDays must be in [1, 365]');
  }

  // Sort by date for safety
  const series = [...input.series].sort((a, b) => a.date.localeCompare(b.date));
  const values = series.map((s) => s.value);

  // 7-day moving average baseline
  const window = Math.min(7, Math.floor(n / 2));
  const ma = movingAverage(values, window);

  // Linear trend on the last 30 points (or all if less)
  const trendWindow = values.slice(-Math.min(30, values.length));
  const trend = linearSlope(trendWindow); // value-units per index

  // Standard deviation of residuals against MA → CI half-width (1.96σ for 95%)
  const residuals: number[] = [];
  for (let i = window; i < values.length; i++) {
    residuals.push(values[i] - ma[i]);
  }
  const stdev = residuals.length > 0 ? standardDeviation(residuals) : 0;
  const halfCi = 1.96 * stdev;

  const lastDate = new Date(series[series.length - 1].date);
  const lastBase = ma[ma.length - 1] ?? values[values.length - 1];

  const forecast: Array<{ date: string; value: number }> = [];
  const ciLower: Array<{ date: string; value: number }> = [];
  const ciUpper: Array<{ date: string; value: number }> = [];

  for (let h = 1; h <= input.horizonDays; h++) {
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + h);
    const point = lastBase + trend * h;
    const dateIso = d.toISOString().slice(0, 10);
    forecast.push({ date: dateIso, value: roundTo(point, 4) });
    ciLower.push({ date: dateIso, value: roundTo(point - halfCi, 4) });
    ciUpper.push({ date: dateIso, value: roundTo(point + halfCi, 4) });
  }

  return { forecast, ciLower, ciUpper, modelName: MODEL_NAME, modelVersion: MODEL_VERSION };
}

function movingAverage(values: number[], w: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= w) sum -= values[i - w];
    out.push(i < w - 1 ? values[i] : sum / Math.min(i + 1, w));
  }
  return out;
}

function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function roundTo(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
