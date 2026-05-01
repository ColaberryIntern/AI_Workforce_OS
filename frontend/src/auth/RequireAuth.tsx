import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Preview mode bypass — when VITE_PREVIEW_MODE=true is set at build
// time (e.g. on a Vercel deploy without a connected backend), render
// the protected children directly without auth/permission checks. Lets
// reviewers see the layout of pages without needing a working login
// loop. Has no effect in production builds where the env var is unset.
const PREVIEW_MODE = import.meta.env.VITE_PREVIEW_MODE === 'true';

export function RequireAuth({
  children,
  permission,
  role,
}: {
  children: ReactNode;
  permission?: string;
  role?: string;
}) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (PREVIEW_MODE) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="d-flex align-items-center muted p-4" role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        <span className="visually-hidden">Loading session</span>
        Verifying session…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (permission && !hasPermission(permission)) return <ForbiddenView reason={`Missing permission: ${permission}`} />;
  if (role && !hasRole(role)) return <ForbiddenView reason={`Requires role: ${role}`} />;

  return <>{children}</>;
}

function ForbiddenView({ reason }: { reason: string }) {
  return (
    <div className="alert alert-warning" role="alert">
      <strong>Access denied.</strong> {reason}
    </div>
  );
}
