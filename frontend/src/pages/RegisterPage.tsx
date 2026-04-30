import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, displayName);
      navigate('/hr-dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-3">Create your account</h1>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="displayName" className="form-label small fw-medium">Full name</label>
                <input
                  id="displayName"
                  required
                  className="form-control form-control-sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label small fw-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  className="form-control form-control-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label small fw-medium">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="form-control form-control-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="form-text small">Minimum 8 characters.</div>
              </div>
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">{error}</div>
              )}
              <button type="submit" className="btn btn-primary btn-sm w-100" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className="muted small mt-3 mb-0">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
