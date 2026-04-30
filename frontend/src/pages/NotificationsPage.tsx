import { useEffect, useState } from 'react';
import { notifications as notifApi } from '../api';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface Notif {
  id: string;
  channel: string;
  eventType: string;
  subject: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export function NotificationsPage() {
  const [items, setItems] = useState<Notif[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notifApi.list().then(setItems).catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell title="Notifications" description="Email + in-app alerts you've received." persona="HR Manager">
      {error && <ErrorBox message={error} />}
      {items === null && !error && <Loading label="Loading notifications" />}
      {items && items.length === 0 && <EmptyState message="No notifications yet." />}
      {items && items.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>When</th>
                  <th>Channel</th>
                  <th>Event</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id}>
                    <td className="muted small">{new Date(n.createdAt).toLocaleString()}</td>
                    <td><span className="badge bg-secondary">{n.channel}</span></td>
                    <td><code>{n.eventType}</code></td>
                    <td>{n.subject ?? '—'}</td>
                    <td>
                      <StatusBadge status={n.status} />
                      {n.lastError && <div className="muted small">{n.lastError}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: 'success',
    pending: 'info',
    failed: 'danger',
    skipped: 'secondary',
  };
  return <span className={`badge bg-${map[status] ?? 'secondary'}`}>{status}</span>;
}
