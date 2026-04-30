import type { ReactNode } from 'react';

export function PageShell({
  title,
  persona,
  description,
  actions,
  children,
}: {
  title: string;
  persona?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <header className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
        <div>
          {persona && <span className="badge bg-secondary text-uppercase me-2">{persona}</span>}
          <h1 className="d-inline-block h3 mb-0">{title}</h1>
          {description && <p className="muted mt-2 mb-0">{description}</p>}
        </div>
        {actions && <div className="d-flex gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="d-flex align-items-center muted">
      <span className="spinner-border spinner-border-sm me-2" role="status">
        <span className="visually-hidden">{label}</span>
      </span>
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="alert alert-warning" role="alert">
      <strong>Could not load.</strong> {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="muted py-3">{message}</div>;
}
