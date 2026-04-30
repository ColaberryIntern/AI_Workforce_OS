import { useEffect, useState } from 'react';
import { health } from '../api';
import { PageShell, Loading, ErrorBox } from '../components/PageShell';

interface HealthInfo {
  status: string;
  db: string;
  uptimeSeconds: number;
  version: string;
}

export function ITAdminPage() {
  const [info, setInfo] = useState<HealthInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setInfo(await health.check());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <PageShell
      title="IT Admin"
      persona="IT Administrator"
      description="System health, integrations, and infrastructure controls."
    >
      {error && <ErrorBox message={error} />}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">System health</div>
            <div className="card-body">
              {info === null && !error && <Loading label="Checking" />}
              {info && (
                <dl className="row mb-0">
                  <dt className="col-5 muted">Status</dt>
                  <dd className="col-7">
                    <span className={`badge bg-${info.status === 'healthy' ? 'success' : 'warning'}`}>
                      {info.status}
                    </span>
                  </dd>
                  <dt className="col-5 muted">Database</dt>
                  <dd className="col-7">
                    <span className={`badge bg-${info.db === 'up' ? 'success' : 'danger'}`}>{info.db}</span>
                  </dd>
                  <dt className="col-5 muted">Version</dt>
                  <dd className="col-7"><code>{info.version}</code></dd>
                  <dt className="col-5 muted">Uptime</dt>
                  <dd className="col-7">{Math.round(info.uptimeSeconds / 60)} min</dd>
                </dl>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">Integrations</div>
            <div className="card-body small">
              <p className="muted mb-2">Webhook subscriptions, SSO, HRIS sync.</p>
              <a href="/webhooks" className="btn btn-outline-secondary btn-sm">Manage webhooks</a>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
