/**
 * Faqe vetëm për admin: cilësimet e një klienti (companyInfo, lidhje te kanalet për aiInstructions).
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { Channel } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface ClientUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyInfo?: string;
}

export function ClientSettings() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [name, setName] = useState('');
  const [companyInfo, setCompanyInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      apiRequest<ClientUser>(`/api/users/${userId}`),
      apiRequest<Channel[]>(`/api/channels?userId=${encodeURIComponent(userId)}`),
    ])
      .then(([u, chs]) => {
        setUser(u);
        setName(u.name ?? '');
        setCompanyInfo(u.companyInfo ?? '');
        setChannels(Array.isArray(chs) ? chs : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [userId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    apiRequest<ClientUser>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: name.trim(), companyInfo: companyInfo.trim() }),
    })
      .then((data) => {
        setUser(data);
        setName(data.name ?? '');
        setCompanyInfo(data.companyInfo ?? '');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.'))
      .finally(() => setSaving(false));
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;
  if (error && !user) return <div className="page-error" role="alert">{error}</div>;
  if (!user) return null;

  return (
    <div className="page-settings page-client-settings">
      <div className="settings-header">
        <Link to="/klientet" className="back-link">← Klientët</Link>
        <h1>Cilësime: {user.name}</h1>
        <p className="settings-email">{user.email}</p>
      </div>
      <p className="page-settings-subtitle">Përgjigjet e chatbotit për këtë klient – informacione të përgjithshme dhe udhëzime për çdo kanal.</p>

      <section className="settings-section">
        <h2>Informacione për chatbot</h2>
        <p className="settings-hint">
          companyInfo – AI e përdor për të formuluar përgjigjet (për këtë klient).
        </p>
        <form onSubmit={handleSubmit} className="settings-form">
          {error && <div className="auth-error">{error}</div>}
          {saveSuccess && <div className="form-success">U ruajt me sukses.</div>}
          <label>
            Emër
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Informacione për chatbot
            <textarea
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              placeholder="Produkte, orare, FAQ…"
              rows={10}
              className="settings-textarea"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Duke ruajtur…' : 'Ruaj'}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>Udhëzime për AI për çdo kanal</h2>
        <p className="settings-hint">
          Ndryshoni udhëzimet për çdo kanal duke hapur kanalin (admin mund të ndryshojë aiInstructions për kanalet e këtij klienti).
        </p>
        {channels.length === 0 ? (
          <p className="settings-empty">Ky klient nuk ka kanale.</p>
        ) : (
          <ul className="settings-channel-links">
            {channels.map((c) => (
              <li key={c._id}>
                <Link to={`/channels/${c._id}`}>
                  {CHANNEL_PLATFORM_LABELS[c.platform as ChannelPlatform]}
                  {c.name ? `: ${c.name}` : ''}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
