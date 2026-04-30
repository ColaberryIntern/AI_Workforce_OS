import { useEffect, useState } from 'react';
import { recommendations as recsApi } from '../api';
import { useAuth } from '../auth/AuthContext';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface Rec {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  confidence: number;
  modelName: string;
  modelVersion: string;
  accepted: boolean | null;
  createdAt: string;
}

export function HRDashboard() {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    try {
      const items = await recsApi.list();
      setRecs(items);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generateNew() {
    if (!user) return;
    setGenerating(true);
    try {
      await recsApi.generate({ userId: user.id, k: 5 });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function accept(id: string) {
    await recsApi.accept(id);
    await load();
  }

  async function reject(id: string) {
    await recsApi.reject(id);
    await load();
  }

  const pending = recs?.filter((r) => r.accepted === null) ?? [];
  const accepted = recs?.filter((r) => r.accepted === true) ?? [];
  const acceptanceRate = recs && recs.length > 0
    ? Math.round((accepted.length / recs.filter((r) => r.accepted !== null).length) * 100) || 0
    : 0;

  return (
    <PageShell
      title="HR Dashboard"
      persona="HR Manager"
      description="Workforce planning, recommendations, and notifications at a glance."
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={generateNew} disabled={generating}>
          {generating ? 'Generating…' : 'Generate recommendations'}
        </button>
      }
    >
      <div className="row g-3 mb-4">
        <KpiCard title="Total recommendations" value={recs ? String(recs.length) : '—'} />
        <KpiCard title="Pending review" value={recs ? String(pending.length) : '—'} />
        <KpiCard title="Acceptance rate" value={recs && recs.length > 0 ? `${acceptanceRate}%` : '—'} />
      </div>

      <section>
        <h2 className="h5 mb-3">Recent recommendations</h2>
        {error && <ErrorBox message={error} />}
        {recs === null && !error && <Loading label="Loading recommendations" />}
        {recs && recs.length === 0 && (
          <EmptyState message="No recommendations yet — generate your first set." />
        )}
        {recs && recs.length > 0 && (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Kind</th>
                    <th>Model</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r) => (
                    <tr key={r.id}>
                      <td>{r.kind}</td>
                      <td className="muted small">
                        {r.modelName}@{r.modelVersion}
                      </td>
                      <td>{Math.round(r.confidence * 100)}%</td>
                      <td>
                        {r.accepted === true && <span className="badge bg-success">Accepted</span>}
                        {r.accepted === false && <span className="badge bg-secondary">Rejected</span>}
                        {r.accepted === null && <span className="badge bg-info">Pending</span>}
                      </td>
                      <td className="muted small">{new Date(r.createdAt).toLocaleString()}</td>
                      <td>
                        {r.accepted === null && (
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => accept(r.id)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => reject(r.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
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
