import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Mbrojtje e faqes: nëse nuk ka token, ridrejton te Login.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Duke ngarkuar…</div>;
  }
  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname.startsWith('/app') ? location : { pathname: '/app' } }} replace />;
  }
  return <>{children}</>;
}
