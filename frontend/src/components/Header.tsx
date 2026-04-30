import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="navbar navbar-expand-lg border-bottom bg-white" aria-label="Main navigation">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand brand-mark">AI Workforce OS</Link>
        <ul className="navbar-nav ms-auto align-items-center">
          <li className="nav-item">
            <Link to="/value-proposition" className="nav-link">Why us</Link>
          </li>
          {user ? (
            <>
              <li className="nav-item muted small me-3">{user.displayName}</li>
              <li className="nav-item">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">Sign in</Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="btn btn-primary btn-sm ms-2">Get started</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
