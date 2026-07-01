import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/api';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader" aria-busy="true" aria-label="Loading application">
        <span className="brand-mark" aria-hidden="true">dx</span>
        <span className="skeleton-line loader-line" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
