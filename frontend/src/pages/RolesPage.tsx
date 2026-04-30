import { useEffect, useState, type FormEvent } from 'react';
import { roles as rolesApi } from '../api';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  parentId: string | null;
  permissions: Array<{ permission: { key: string; description: string | null } }>;
}

export function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRoles(await rolesApi.list());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await rolesApi.create({ name, description: description || undefined });
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return;
    try {
      await rolesApi.delete(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <PageShell
      title="Roles & permissions"
      persona="IT Administrator"
      description="Hierarchical roles + permission sets. Every change is audited."
    >
      {error && <ErrorBox message={error} />}

      <section className="mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white fw-semibold">Create new role</div>
          <div className="card-body">
            <form className="row g-2 align-items-end" onSubmit={handleCreate}>
              <div className="col-md-4">
                <label htmlFor="role-name" className="form-label small fw-medium">Name</label>
                <input
                  id="role-name"
                  required
                  className="form-control form-control-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="role-desc" className="form-label small fw-medium">Description</label>
                <input
                  id="role-desc"
                  className="form-control form-control-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={busy}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section>
        <h2 className="h5 mb-3">All roles</h2>
        {roles === null && !error && <Loading label="Loading roles" />}
        {roles && roles.length === 0 && <EmptyState message="No roles yet." />}
        {roles && roles.length > 0 && (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Permissions</th>
                    <th>Type</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td className="muted small">{r.description ?? '—'}</td>
                      <td className="small">
                        {r.permissions.length === 0 && <span className="muted">none</span>}
                        {r.permissions.slice(0, 4).map((p) => (
                          <span key={p.permission.key} className="badge bg-light text-dark me-1">
                            {p.permission.key}
                          </span>
                        ))}
                        {r.permissions.length > 4 && (
                          <span className="muted small">+{r.permissions.length - 4}</span>
                        )}
                      </td>
                      <td>
                        {r.isSystem ? (
                          <span className="badge bg-info">system</span>
                        ) : (
                          <span className="muted small">custom</span>
                        )}
                      </td>
                      <td>
                        {!r.isSystem && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete
                          </button>
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
