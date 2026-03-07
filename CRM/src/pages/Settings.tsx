/**
 * Faqe Cilësime për klientin: informacione për chatbot (companyInfo) dhe lidhje te udhëzimet për AI për çdo kanal.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { Channel } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface MeUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyInfo?: string;
}

export function Settings() {
  const [_user, setUser] = useState<MeUser | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [companyInfo, setCompanyInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<MeUser>('/api/auth/me'),
      apiRequest<Channel[]>('/api/channels'),
    ])
      .then(([me, chs]) => {
        setUser(me);
        setCompanyInfo(me.companyInfo ?? '');
        setChannels(Array.isArray(chs) ? chs : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    apiRequest<MeUser>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ companyInfo: companyInfo.trim() }),
    })
      .then((data) => {
        setUser(data);
        setCompanyInfo(data.companyInfo ?? '');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.'))
      .finally(() => setSaving(false));
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;

  return (
    <div className="page-settings">
      <h1>Basic settings</h1>
      <p className="page-settings-subtitle">Përgjigjet e chatbotit – informacione të përgjithshme dhe udhëzime për çdo kanal.</p>

      <section className="settings-section">
        <h2>Informacione për chatbot</h2>
        <p className="settings-hint">
          Produkte, orare, FAQ – AI përdor këtë tekst për të formuluar përgjigjet (për të gjitha kanalet, përveç nëse kanali ka udhëzime të veta).
        </p>
        <form onSubmit={handleSubmit} className="settings-form">
          {error && <div className="auth-error">{error}</div>}
          {saveSuccess && <div className="form-success">U ruajt me sukses.</div>}
          <label>
            <textarea
              value={companyInfo}
              onChange={(e) => setCompanyInfo(e.target.value)}
              placeholder="Përshkrimi i kompanisë, produkte, çmime, orare, pyetje të shpeshta…"
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
          Për udhëzime specifike për një kanal (Instagram, Facebook, etj.), hapni kanalin dhe ndryshoni fushën “Udhëzime për AI”.
        </p>
        {channels.length === 0 ? (
          <p className="settings-empty">Nuk keni kanale. <Link to="/channels">Shtoni një kanal</Link>.</p>
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
