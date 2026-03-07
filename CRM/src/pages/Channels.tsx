import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { Channel, ChannelPlatform, ChannelStatus } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS, CHANNEL_STATUS_LABELS } from '../types/channel';

export function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  function loadChannels() {
    setLoading(true);
    setError('');
    apiRequest<Channel[]>('/api/channels')
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadChannels();
  }, []);

  if (loading) return <div className="page-loading">Duke ngarkuar kanalet…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;

  return (
    <div className="page-channels">
      <div className="page-channels-header">
        <h1>Kanale</h1>
        <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
          Shto kanal
        </button>
      </div>
      <p className="page-channels-hint">
        Lidhni Instagram, Facebook, WhatsApp ose Viber. Pas shtimit mund të konfiguroni udhëzimet për AI dhe statusin.
      </p>
      {channels.length === 0 ? (
        <div className="channels-empty">
          <p>Nuk keni ende kanale të lidhura.</p>
          <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
            Lidh kanal (Instagram, Facebook, WhatsApp, Viber)
          </button>
        </div>
      ) : (
        <ul className="channels-list">
          {channels.map((ch) => (
            <li key={ch._id} className="channel-card">
              <div className="channel-card-inner">
                <Link to={`/app/channels/${ch._id}`} className="channel-card-link">
                  <span className="channel-platform">{CHANNEL_PLATFORM_LABELS[ch.platform as ChannelPlatform]}</span>
                  <span className="channel-name">{ch.name || 'Pa emër'}</span>
                  <span className={`channel-status channel-status--${ch.status}`}>
                    {CHANNEL_STATUS_LABELS[ch.status]}
                  </span>
                </Link>
                <div className="channel-card-actions">
                  <label className="chatbot-switch-label" onClick={(e) => e.preventDefault()}>
                    <span className="chatbot-switch-text">Chatbot</span>
                    <input
                      type="checkbox"
                      className="chatbot-switch"
                      checked={ch.status === 'active'}
                      readOnly
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const next: ChannelStatus = ch.status === 'active' ? 'inactive' : 'active';
                        apiRequest<Channel>(`/api/channels/${ch._id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ status: next }),
                        })
                          .then((updated) => {
                            setChannels((prev) =>
                              prev.map((c) => (c._id === ch._id ? { ...c, status: updated.status } : c))
                            );
                          })
                          .catch(() => {});
                      }}
                    />
                    <span className="chatbot-switch-slider" />
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showAdd && (
        <AddChannelModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            loadChannels();
          }}
        />
      )}
    </div>
  );
}

interface AddChannelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddChannelModal({ onClose, onSuccess }: AddChannelModalProps) {
  const [platform, setPlatform] = useState<ChannelPlatform>('instagram');
  const [name, setName] = useState('');
  const [platformPageId, setPlatformPageId] = useState('');
  const [viberBotId, setViberBotId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isViber = platform === 'viber';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!accessToken.trim()) {
      setError('Tokeni i aksesit është i detyrueshëm.');
      return;
    }
    setSubmitting(true);
    const body: Record<string, unknown> = {
      platform,
      accessToken: accessToken.trim(),
      name: name.trim() || null,
    };
    if (isViber) {
      body.viberBotId = viberBotId.trim() || null;
    } else {
      body.platformPageId = platformPageId.trim() || null;
    }
    apiRequest<Channel>('/api/channels', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then(() => onSuccess())
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gabim gjatë shtimit.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Shto kanal</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Mbyll">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="auth-error">{error}</div>}
          <label>
            Platformë
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ChannelPlatform)}
              required
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="viber">Viber</option>
            </select>
          </label>
          <label>
            Emër (opsional)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p.sh. Faqja ime në Instagram"
            />
          </label>
          {isViber ? (
            <label>
              Viber Bot ID (opsional)
              <input
                type="text"
                value={viberBotId}
                onChange={(e) => setViberBotId(e.target.value)}
                placeholder="ID e botit Viber"
              />
            </label>
          ) : (
            <label>
              Page ID / Faqe (opsional për Meta)
              <input
                type="text"
                value={platformPageId}
                onChange={(e) => setPlatformPageId(e.target.value)}
                placeholder="ID e faqes Meta"
              />
            </label>
          )}
          <label>
            Access token <span className="required">*</span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Token nga Meta Developer ose Viber"
              required
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anulo
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Duke shtuar…' : 'Shto kanal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
