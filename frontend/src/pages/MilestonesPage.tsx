import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  milestones as milestonesApi,
  type MilestoneRow,
  type MilestoneStatus,
  type MilestoneSummary,
} from '../api';
import { useAuth } from '../auth/AuthContext';
import { PageShell, Loading, ErrorBox, EmptyState } from '../components/PageShell';

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  done: 'Done',
  at_risk: 'At risk',
  skipped: 'Skipped',
};

const STATUS_BADGE: Record<MilestoneStatus, string> = {
  planned: 'secondary',
  in_progress: 'info',
  done: 'success',
  at_risk: 'warning',
  skipped: 'light text-dark',
};

interface NewMilestoneDraft {
  phase: number;
  code: string;
  title: string;
  description: string;
  criteria: string;
  deliverables: string;
  dueDate: string;
}

const EMPTY_DRAFT: NewMilestoneDraft = {
  phase: 1,
  code: '',
  title: '',
  description: '',
  criteria: '',
  deliverables: '',
  dueDate: '',
};

export function MilestonesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('milestone.write');

  const [items, setItems] = useState<MilestoneRow[] | null>(null);
  const [summary, setSummary] = useState<MilestoneSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<NewMilestoneDraft>(EMPTY_DRAFT);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const params: { phase?: number; status?: MilestoneStatus } = {};
      if (phaseFilter !== 'all') params.phase = phaseFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [list, summ] = await Promise.all([
        milestonesApi.list(params),
        milestonesApi.summary().catch(() => null),
      ]);
      setItems(list);
      if (summ) setSummary(summ);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseFilter, statusFilter]);

  async function handleTransition(id: string, status: MilestoneStatus) {
    setBusyId(id);
    try {
      await milestonesApi.transition(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this milestone?')) return;
    setBusyId(id);
    try {
      await milestonesApi.delete(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await milestonesApi.create({
        phase: draft.phase,
        code: draft.code,
        title: draft.title,
        description: draft.description || null,
        criteria: draft.criteria || null,
        deliverables: draft.deliverables || null,
        dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
      });
      setShowForm(false);
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Group items by phase for the rendered list
  const grouped = useMemo(() => {
    if (!items) return null;
    const map = new Map<number, MilestoneRow[]>();
    for (const m of items) {
      const list = map.get(m.phase) ?? [];
      list.push(m);
      map.set(m.phase, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [items]);

  return (
    <PageShell
      title="Milestones"
      persona="Project Manager"
      description="Track delivery milestones across the four phases. Status changes are audited."
      actions={
        canWrite && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? 'Cancel' : 'New milestone'}
          </button>
        )
      }
    >
      {error && <ErrorBox message={error} />}

      {summary && (
        <div className="row g-3 mb-4">
          <KpiCard title="Total" value={String(summary.total)} />
          <KpiCard title="In progress" value={String(summary.inProgress)} />
          <KpiCard title="Done" value={`${summary.done} (${summary.donePct}%)`} />
          <KpiCard
            title="At risk"
            value={String(summary.atRisk)}
            tone={summary.atRisk > 0 ? 'warning' : undefined}
          />
        </div>
      )}

      {showForm && canWrite && (
        <section className="mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold">New milestone</div>
            <div className="card-body">
              <form className="row g-2 align-items-end" onSubmit={handleCreate}>
                <div className="col-md-1">
                  <label htmlFor="ms-phase" className="form-label small fw-medium">Phase</label>
                  <input
                    id="ms-phase"
                    type="number"
                    min={1}
                    max={20}
                    required
                    className="form-control form-control-sm"
                    value={draft.phase}
                    onChange={(e) => setDraft({ ...draft, phase: Number(e.target.value) })}
                  />
                </div>
                <div className="col-md-2">
                  <label htmlFor="ms-code" className="form-label small fw-medium">Code</label>
                  <input
                    id="ms-code"
                    required
                    placeholder="e.g. 1.4"
                    className="form-control form-control-sm"
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="ms-title" className="form-label small fw-medium">Title</label>
                  <input
                    id="ms-title"
                    required
                    className="form-control form-control-sm"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="ms-due" className="form-label small fw-medium">Due date</label>
                  <input
                    id="ms-due"
                    type="date"
                    className="form-control form-control-sm"
                    value={draft.dueDate}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  />
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-primary btn-sm w-100">Create</button>
                </div>
                <div className="col-12">
                  <label htmlFor="ms-criteria" className="form-label small fw-medium mb-1">Criteria</label>
                  <textarea
                    id="ms-criteria"
                    rows={2}
                    className="form-control form-control-sm"
                    value={draft.criteria}
                    onChange={(e) => setDraft({ ...draft, criteria: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="ms-deliv" className="form-label small fw-medium mb-1">Deliverables</label>
                  <textarea
                    id="ms-deliv"
                    rows={2}
                    className="form-control form-control-sm"
                    value={draft.deliverables}
                    onChange={(e) => setDraft({ ...draft, deliverables: e.target.value })}
                  />
                </div>
              </form>
            </div>
          </div>
        </section>
      )}

      <section className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <label className="form-label small fw-medium mb-0" htmlFor="phase-filter">Phase</label>
        <select
          id="phase-filter"
          className="form-select form-select-sm"
          style={{ width: 120 }}
          value={String(phaseFilter)}
          onChange={(e) => setPhaseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All</option>
          <option value="1">Phase 1</option>
          <option value="2">Phase 2</option>
          <option value="3">Phase 3</option>
          <option value="4">Phase 4</option>
        </select>
        <label className="form-label small fw-medium mb-0 ms-3" htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          className="form-select form-select-sm"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </section>

      {items === null && !error && <Loading label="Loading milestones" />}
      {items && items.length === 0 && (
        <EmptyState message="No milestones match the current filters." />
      )}

      {grouped &&
        grouped.map(([phase, list]) => (
          <section key={phase} className="mb-4">
            <h2 className="h6 text-uppercase muted mb-3">Phase {phase}</h2>
            <div className="row g-3">
              {list.map((m) => (
                <article key={m.id} className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="muted small me-2">#{m.code}</span>
                          <strong>{m.title}</strong>
                        </div>
                        <span className={`badge bg-${STATUS_BADGE[m.status]}`}>
                          {STATUS_LABELS[m.status]}
                        </span>
                      </div>
                      {m.description && <p className="muted small mb-2">{m.description}</p>}
                      {m.criteria && (
                        <div className="small mb-2">
                          <strong>Criteria:</strong> <span className="muted">{m.criteria}</span>
                        </div>
                      )}
                      {m.deliverables && (
                        <div className="small mb-2">
                          <strong>Deliverables:</strong>{' '}
                          <span className="muted">{m.deliverables}</span>
                        </div>
                      )}
                      <div className="muted small mb-3">
                        Due {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '—'}
                        {m.completedAt && (
                          <>
                            {' · '}Completed {new Date(m.completedAt).toLocaleDateString()}
                          </>
                        )}
                      </div>
                      {canWrite && (
                        <div className="d-flex flex-wrap gap-2">
                          {m.status !== 'in_progress' && m.status !== 'done' && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={busyId === m.id}
                              onClick={() => handleTransition(m.id, 'in_progress')}
                            >
                              Start
                            </button>
                          )}
                          {m.status !== 'done' && (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              disabled={busyId === m.id}
                              onClick={() => handleTransition(m.id, 'done')}
                            >
                              Mark complete
                            </button>
                          )}
                          {m.status !== 'at_risk' && m.status !== 'done' && (
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm"
                              disabled={busyId === m.id}
                              onClick={() => handleTransition(m.id, 'at_risk')}
                            >
                              Flag at risk
                            </button>
                          )}
                          {m.status !== 'skipped' && m.status !== 'done' && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              disabled={busyId === m.id}
                              onClick={() => handleTransition(m.id, 'skipped')}
                            >
                              Skip
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm ms-auto"
                            disabled={busyId === m.id}
                            onClick={() => handleDelete(m.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
    </PageShell>
  );
}

function KpiCard({ title, value, tone }: { title: string; value: string; tone?: 'warning' }) {
  return (
    <div className="col-md-3">
      <div className={`card border-0 shadow-sm ${tone === 'warning' ? 'bg-warning-subtle' : ''}`}>
        <div className="card-body">
          <div className="muted small text-uppercase">{title}</div>
          <div className="h3 mb-0">{value}</div>
        </div>
      </div>
    </div>
  );
}
