import { useEffect, useState } from 'react';
import { audit } from '../api';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface AuditRow {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  occurredAt: string;
}

export function AuditPage() {
  const [items, setItems] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  async function load(reset = false) {
    try {
      const res = await audit.list({
        action: actionFilter || undefined,
        cursor: reset ? undefined : cursor ?? undefined,
        limit: 50,
      });
      setItems(reset ? res.data : [...(items ?? []), ...res.data]);
      const nextCursor = (res.meta as { nextCursor?: string | null } | undefined)?.nextCursor ?? null;
      setCursor(nextCursor);
      setHasMore(Boolean(nextCursor));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter() {
    setItems(null);
    setCursor(null);
    load(true);
  }

  return (
    <PageShell title="Audit log" persona="IT Administrator" description="Immutable record of every state change.">
      {error && <ErrorBox message={error} />}
      <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <input
          type="search"
          placeholder="Filter by action (e.g. role.create)"
          className="form-control form-control-sm"
          style={{ maxWidth: 320 }}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={applyFilter}>
          Apply
        </button>
      </div>

      {items === null && !error && <Loading label="Loading audit log" />}
      {items && items.length === 0 && <EmptyState message="No audit entries match." />}
      {items && items.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="muted small">{new Date(row.occurredAt).toLocaleString()}</td>
                    <td><code>{row.action}</code></td>
                    <td className="small">{row.resource}</td>
                    <td className="muted small">{row.userId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="card-footer bg-white text-end">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => load(false)}>
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
