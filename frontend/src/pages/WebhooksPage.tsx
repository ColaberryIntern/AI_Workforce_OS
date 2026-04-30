import { useEffect, useState, type FormEvent } from 'react';
import { webhooks as whApi } from '../api';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failures: number;
}

export function WebhooksPage() {
  const [items, setItems] = useState<Webhook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [eventsCsv, setEventsCsv] = useState('staffing.shortage,recommendation.ready');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setItems(await whApi.list());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreatedSecret(null);
    try {
      const events = eventsCsv.split(',').map((s) => s.trim()).filter(Boolean);
      const result = await whApi.create({ url, events });
      setCreatedSecret(result.secret);
      setUrl('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTest(id: string) {
    try {
      await whApi.test(id, 'test.ping');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return;
    try {
      await whApi.delete(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <PageShell
      title="Webhooks"
      persona="IT Administrator"
      description="HMAC-signed event delivery to external systems."
    >
      {error && <ErrorBox message={error} />}

      <section className="mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">Register new webhook</div>
          <div className="card-body">
            <form className="row g-2 align-items-end" onSubmit={handleCreate}>
              <div className="col-md-5">
                <label htmlFor="url" className="form-label small fw-medium">URL (HTTPS)</label>
                <input
                  id="url"
                  type="url"
                  required
                  className="form-control form-control-sm"
                  placeholder="https://example.com/hook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="col-md-5">
                <label htmlFor="events" className="form-label small fw-medium">Events (comma-separated)</label>
                <input
                  id="events"
                  required
                  className="form-control form-control-sm"
                  value={eventsCsv}
                  onChange={(e) => setEventsCsv(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={busy}>
                  Register
                </button>
              </div>
            </form>
            {createdSecret && (
              <div className="alert alert-success mt-3 small mb-0" role="alert">
                <strong>Save this secret now</strong> — it won't be shown again:
                <pre className="mb-0 mt-2"><code>{createdSecret}</code></pre>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="h5 mb-3">Registered webhooks</h2>
        {items === null && !error && <Loading label="Loading webhooks" />}
        {items && items.length === 0 && <EmptyState message="No webhooks yet." />}
        {items && items.length > 0 && (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>URL</th>
                    <th>Events</th>
                    <th>Status</th>
                    <th>Failures</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((w) => (
                    <tr key={w.id}>
                      <td className="small text-truncate" style={{ maxWidth: 320 }}>{w.url}</td>
                      <td className="small">
                        {w.events.map((e) => (
                          <span key={e} className="badge bg-light text-dark me-1">{e}</span>
                        ))}
                      </td>
                      <td>
                        {w.isActive ? (
                          <span className="badge bg-success">active</span>
                        ) : (
                          <span className="badge bg-secondary">disabled</span>
                        )}
                      </td>
                      <td>{w.failures}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleTest(w.id)}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(w.id)}
                          >
                            Delete
                          </button>
                        </div>
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
