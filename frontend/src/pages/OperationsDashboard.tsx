import { useState } from 'react';
import { forecast } from '../api';
import { PageShell, ErrorBox } from '../components/PageShell';

interface ForecastPoint {
  date: string;
  value: number;
}

interface ForecastResult {
  id?: string;
  forecast: ForecastPoint[];
  ciLower: ForecastPoint[];
  ciUpper: ForecastPoint[];
  modelName?: string;
  modelVersion?: string;
}

function syntheticSeries(): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 60);
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const v = 100 + i * 0.4 + Math.sin(i / 7) * 6;
    out.push({ date: d.toISOString().slice(0, 10), value: Math.round(v * 10) / 10 });
  }
  return out;
}

export function OperationsDashboard() {
  const [horizon, setHorizon] = useState(14);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function compute() {
    setBusy(true);
    setError(null);
    try {
      const res = (await forecast.compute({
        scope: 'global',
        horizonDays: horizon,
        series: syntheticSeries(),
      })) as ForecastResult;
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Operations Dashboard"
      persona="Operations Manager"
      description="Demand forecasts, schedule integrity, real-time staffing health."
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={compute} disabled={busy}>
          {busy ? 'Computing…' : 'Run forecast'}
        </button>
      }
    >
      <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
        <label className="form-label small fw-medium mb-0" htmlFor="horizon">
          Horizon (days):
        </label>
        <input
          id="horizon"
          type="number"
          min={1}
          max={90}
          className="form-control form-control-sm"
          style={{ width: 100 }}
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
        />
        <span className="muted small">Uses 60 days of synthetic history.</span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <section>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">
              Forecast — {result.modelName}@{result.modelVersion}
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Lower 95% CI</th>
                    <th>Point estimate</th>
                    <th>Upper 95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {result.forecast.map((p, i) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td className="muted">{result.ciLower[i].value}</td>
                      <td><strong>{p.value}</strong></td>
                      <td className="muted">{result.ciUpper[i].value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {!result && !error && (
        <p className="muted">
          Click <em>Run forecast</em> to compute a 14-day demand forecast against the deterministic
          baseline (moving-average + linear trend).
        </p>
      )}
    </PageShell>
  );
}
