import { Link } from 'react-router-dom';
import { PageShell } from '../components/PageShell';

export function NotFoundPage() {
  return (
    <PageShell title="Page not found">
      <p className="muted">That route doesn't exist.</p>
      <Link to="/" className="btn btn-primary btn-sm">Back to home</Link>
    </PageShell>
  );
}
