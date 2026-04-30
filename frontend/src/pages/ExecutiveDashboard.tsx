import { useEffect, useState } from 'react';
import { analytics } from '../api';
import { PageShell, Loading, ErrorBox } from '../components/PageShell';

interface Summary {
  dau: number;
  wau: number;
  mau: number;
  topEvents: Array<{ eventName: string; count: number }>;
}

export function ExecutiveDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analytics
      .summary()
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <PageShell title="Executive Dashboard" persona="Executive" description="Outcomes, ROI, strategic indicators.">
      {error && <ErrorBox message={error} />}
      {summary === null && !error && <Loading label="Loading analytics" />}
      {summary && (
        <>
          <div className="row g-3 mb-4">
            <KpiCard title="Daily active users" value={String(summary.dau)} />
            <KpiCard title="Weekly active users" value={String(summary.wau)} />
            <KpiCard title="Monthly active users" value={String(summary.mau)} />
          </div>

          <section>
            <h2 className="h5 mb-3">Top events (7d)</h2>
            <div className="card border-0 shadow-sm">
              {summary.topEvents.length === 0 ? (
                <div className="card-body muted">No events in the last 7 days.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Event</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topEvents.map((e) => (
                        <tr key={e.eventName}>
                          <td>{e.eventName}</td>
                          <td>{e.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="col-md-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="muted small text-uppercase">{title}</div>
          <div className="h3 mb-0">{value}</div>
        </div>
      </div>
    </div>
  );
}
