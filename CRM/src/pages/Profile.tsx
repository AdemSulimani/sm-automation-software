/**
 * Faqe Profili – ndryshimi i emrit, email-it dhe fjalëkalimit; eksport dhe fshirje llogarie (GDPR).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface MeUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function Profile() {
  const { updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiRequest<MeUser>('/api/auth/me')
      .then((data) => {
        setName(data.name ?? '');
        setEmail(data.email ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const newPwd = newPassword.trim();
    const confirmPwd = confirmPassword.trim();
    if (newPwd && newPwd !== confirmPwd) {
      setError('Fjalëkalimi i ri dhe konfirmimi nuk përputhen.');
      return;
    }
    if (newPwd && newPwd.length < 6) {
      setError('Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.');
      return;
    }
    if (newPwd && !currentPassword.trim()) {
      setError('Vendosni fjalëkalimin aktual për të ndryshuar fjalëkalimin.');
      return;
    }
    setSubmitting(true);
    const body: { name: string; email: string; currentPassword?: string; newPassword?: string } = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };
    if (newPwd) {
      body.currentPassword = currentPassword.trim();
      body.newPassword = newPwd;
    }
    apiRequest<MeUser>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
      .then((data) => {
        updateUser({ name: data.name, email: data.email });
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(false), 3000);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.'))
      .finally(() => setSubmitting(false));
  }

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      const data = await apiRequest<Record<string, unknown>>('/api/auth/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sm-automation-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë eksportit.');
    } finally {
      setExporting(false);
    }
  }

  function openDeleteConfirm() {
    setDeleteConfirmOpen(true);
    setDeletePassword('');
    setDeleteError('');
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setDeletePassword('');
    setDeleteError('');
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!deletePassword.trim()) {
      setDeleteError('Vendosni fjalëkalimin për të konfirmuar fshirjen.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await apiRequest('/api/auth/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword.trim() }),
      });
      logout();
      window.location.replace('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gabim gjatë fshirjes.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;

  return (
    <div className="page-profile">
      <h1>Profili im</h1>
      <p className="page-profile-hint">Ndryshoni emrin, email-in dhe fjalëkalimin.</p>
      <form onSubmit={handleSubmit} className="profile-form">
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="form-success">U ruajt me sukses.</div>}
        <label>
          Emri
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Emri juaj"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@shembull.com"
          />
        </label>
        <fieldset className="profile-password-section">
          <legend>Ndrysho fjalëkalimin</legend>
          <p className="profile-password-hint">Lini bosh nëse nuk dëshironi ta ndryshoni.</p>
          <label>
            Fjalëkalimi aktual
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
          <label>
            Fjalëkalimi i ri
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Konfirmo fjalëkalimin e ri
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>
        </fieldset>
        <div className="modal-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </button>
        </div>
      </form>

      <section className="profile-data-section">
        <h2>Të dhënat dhe llogaria</h2>
        <p className="profile-data-hint">
          Ju keni të drejtë të eksportoni të dhënat tuaja (portabilitet) dhe të fshini llogarinë. Shihni{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Politika e privatësisë</a>.
        </p>
        <div className="profile-data-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Duke eksportuar…' : 'Eksporto të dhënat e mia'}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={openDeleteConfirm}
          >
            Fshi llogarinë
          </button>
        </div>
      </section>

      {deleteConfirmOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="modal-card">
            <h2 id="delete-account-title">Fshi llogarinë</h2>
            <p>
              Kjo do të fshijë përgjithmonë llogarinë tuaj dhe të gjitha të dhënat (kanale, kontakte, biseda, mesazhe).
              Ky veprim nuk mund të kthehet.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <label>
                Vendosni fjalëkalimin për të konfirmuar
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={deleting}
                />
              </label>
              {deleteError && <div className="auth-error">{deleteError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeDeleteConfirm} disabled={deleting}>
                  Anulo
                </button>
                <button type="submit" className="btn-danger" disabled={deleting}>
                  {deleting ? 'Duke fshirë…' : 'Fshi përgjithmonë'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
