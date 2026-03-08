import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredUser } from '../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = getStoredUser();
      const target = from && from.startsWith('/app') ? from : undefined;
      if (user?.role === 'admin') {
        navigate(target ?? '/app/klientet', { replace: true });
      } else {
        navigate(target ?? '/app', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim në hyrje.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Hyr në CRM</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Fjalëkalim
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <label className="auth-show-password">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                aria-label="Shfaq fjalëkalimin"
              />
              Shfaq fjalëkalimin
            </label>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Duke hyrë…' : 'Hyr'}
          </button>
        </form>
        <p className="auth-footer">
          Nuk keni llogari? <Link to="/register">Regjistrohuni</Link>
        </p>
      </div>
    </div>
  );
}
