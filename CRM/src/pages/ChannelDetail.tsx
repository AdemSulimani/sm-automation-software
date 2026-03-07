import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { Channel, ChannelPlatform, ChannelStatus } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';

export function ChannelDetail() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ChannelStatus>('active');
  const [aiInstructions, setAiInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    setError('');
    apiRequest<Channel>(`/api/channels/${channelId}`)
      .then((data) => {
        setChannel(data);
        setName(data.name ?? '');
        setStatus(data.status as ChannelStatus);
        setAiInstructions(data.aiInstructions ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Kanali nuk u gjet.'))
      .finally(() => setLoading(false));
  }, [channelId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId) return;
    setSaving(true);
    setSaveSuccess(false);
    apiRequest<Channel>(`/api/channels/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: name.trim() || null, status, aiInstructions: aiInstructions.trim() }),
    })
      .then((data) => {
        setChannel(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.');
      })
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (!channelId || !window.confirm('Jeni të sigurt që dëshironi ta fshini këtë kanal?')) return;
    setDeleting(true);
    apiRequest(`/api/channels/${channelId}`, { method: 'DELETE' })
      .then(() => navigate('/channels', { replace: true }))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë fshirjes.'))
      .finally(() => setDeleting(false));
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;
  if (error && !channel) return <div className="page-error" role="alert">{error}</div>;
  if (!channel) return null;

  return (
    <div className="page-channel-detail">
      <div className="channel-detail-header">
        <Link to="/channels" className="back-link">← Kanale</Link>
        <h1>
          {CHANNEL_PLATFORM_LABELS[channel.platform as ChannelPlatform]}
          {channel.name ? `: ${channel.name}` : ''}
        </h1>
      </div>
      <div className="channel-chatbot-toggle">
        <span className="channel-chatbot-label">Chatbot aktiv</span>
        <label className="chatbot-switch-label" onClick={(e) => e.preventDefault()}>
          <input
            type="checkbox"
            className="chatbot-switch"
            checked={status === 'active'}
            readOnly
            onClick={(e) => {
              e.preventDefault();
              const next = status === 'active' ? 'inactive' : 'active';
              setStatus(next);
              if (!channelId) return;
              apiRequest<Channel>(`/api/channels/${channelId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: next }),
              })
                .then((data) => setChannel(data))
                .catch(() => setError('Gabim gjatë ndryshimit.'));
            }}
          />
          <span className="chatbot-switch-slider" />
        </label>
        <span className="channel-chatbot-hint">{status === 'active' ? 'ON – përgjigje automatike' : 'OFF – vetëm përgjigje manuale'}</span>
      </div>
      <form onSubmit={handleSubmit} className="channel-detail-form">
        {error && <div className="auth-error">{error}</div>}
        {saveSuccess && <div className="form-success">U ruajt me sukses.</div>}
        <label>
          Emër kanali
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emër i lexueshëm për këtë kanal"
          />
        </label>
        <label>
          Status (Aktiv = Chatbot ON, Jo aktiv = Chatbot OFF)
          <select value={status} onChange={(e) => setStatus(e.target.value as ChannelStatus)}>
            <option value="active">Aktiv (Chatbot ON)</option>
            <option value="inactive">Jo aktiv (Chatbot OFF)</option>
            <option value="pending">Në pritje</option>
          </select>
        </label>
        <label>
          Udhëzime për AI
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder="Përshkrimi i kompanisë, toni i përgjigjeve, FAQ – përdoret nga chatbot për këtë kanal"
            rows={6}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Duke fshirë…' : 'Fshi kanalin'}
          </button>
        </div>
      </form>
    </div>
  );
}
