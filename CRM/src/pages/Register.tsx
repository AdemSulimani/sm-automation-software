import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Regjistrim vetëm për klientë (kompanitë). Backend krijon User me role "client".
 * Admin nuk krijohen nga kjo formë.
 */
export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim në regjistrim.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Regjistrohu (klient)</h1>
        <p className="auth-hint">Regjistrimi krijon një llogari klient. Admin krijohen nga administratori.</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label>
            Emër
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
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
              minLength={6}
              autoComplete="new-password"
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
            {loading ? 'Duke u regjistruar…' : 'Regjistrohu'}
          </button>
        </form>
        <p className="auth-footer">
          Keni tashmë llogari? <Link to="/login">Hyni</Link>
        </p>
      </div>
    </div>
  );
}
