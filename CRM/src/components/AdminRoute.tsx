import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Faqe vetëm për admin: nëse role nuk është admin, ridrejton te dashboard i klientit.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Duke ngarkuar…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
