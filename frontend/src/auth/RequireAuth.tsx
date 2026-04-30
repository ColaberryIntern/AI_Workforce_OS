import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

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
