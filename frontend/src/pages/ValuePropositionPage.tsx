import { useEffect, useState } from 'react';
import { valueProp } from '../api';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface VP {
  id: string;
  title: string;
  summary: string;
  audience: string;
}

interface Matrix {
  capabilities: Array<{ id: string; name: string }>;
  competitors: Array<{ id: string; name: string; isOwn: boolean }>;
  cells: Array<{ capabilityId: string; competitorId: string; value: string; note: string | null }>;
}

interface Gap {
  id: string;
  title: string;
  description: string;
  ourAnswer: string;
}

export function ValuePropositionPage() {
  const [items, setItems] = useState<VP[] | null>(null);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([valueProp.list(), valueProp.matrix(), valueProp.gaps()])
      .then(([vps, m, g]) => {
        setItems(vps);
        setMatrix(m);
        setGaps(g);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <PageShell
      title="Value proposition"
      description="Why HR leaders choose AI Workforce OS over the alternatives."
    >
      {error && <ErrorBox message={error} />}

      <section className="mb-5">
        <h2 className="h5 mb-3">What you get</h2>
        {items === null && !error && <Loading label="Loading value propositions" />}
        {items && items.length === 0 && <EmptyState message="No value propositions yet." />}
        {items && items.length > 0 && (
          <div className="row g-3">
            {items.map((vp) => (
              <div key={vp.id} className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <span className="badge bg-secondary text-uppercase mb-2">
                      {vp.audience.replace('_', ' ')}
                    </span>
                    <h3 className="h5 mb-2">{vp.title}</h3>
                    <p className="mb-0">{vp.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-5">
        <h2 className="h5 mb-3">How we compare</h2>
        {matrix === null && !error && <Loading label="Loading matrix" />}
        {matrix && (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Capability</th>
                  {matrix.competitors.map((c) => (
                    <th key={c.id} scope="col" className={c.isOwn ? 'text-primary fw-bold' : ''}>
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.capabilities.map((cap) => (
                  <tr key={cap.id}>
                    <th scope="row">{cap.name}</th>
                    {matrix.competitors.map((comp) => {
                      const cell = matrix.cells.find(
                        (x) => x.capabilityId === cap.id && x.competitorId === comp.id,
                      );
                      return (
                        <td key={comp.id}>
                          <CellBadge value={cell?.value} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="h5 mb-3">Gaps we close</h2>
        {gaps === null && !error && <Loading label="Loading gaps" />}
        {gaps && (
          <div className="row g-3">
            {gaps.map((g) => (
              <div key={g.id} className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h3 className="h6 mb-2">{g.title}</h3>
                    <p className="muted small mb-2">{g.description}</p>
                    <p className="mb-0"><strong>Our answer:</strong> {g.ourAnswer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function CellBadge({ value }: { value?: string }) {
  if (!value) return <span className="muted">—</span>;
  const map: Record<string, string> = {
    YES: 'success',
    HIGH: 'success',
    LIMITED: 'warning',
    MEDIUM: 'warning',
    NO: 'danger',
    LOW: 'danger',
  };
  return <span className={`badge bg-${map[value] ?? 'secondary'}`}>{value}</span>;
}
