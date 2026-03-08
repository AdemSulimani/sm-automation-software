import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, getStoredToken } from '../services/api';
import { env } from '../config/env';
import type { Channel, ChannelPlatform, ChannelStatus } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS, CHANNEL_STATUS_LABELS } from '../types/channel';

interface OAuthSelection {
  pages: { id: string; name: string }[];
  instagram: { id: string; username: string; pageId: string; pageName: string }[];
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Mungon tokeni. Hyni përsëri në llogari.',
  invalid_token: 'Sesioni ka skaduar. Hyni përsëri në llogari.',
  session_expired_or_invalid: 'Sesioni OAuth ka skaduar. Provoni përsëri.',
  missing_code_or_state: 'Meta nuk dërgoi të dhënat e duhura. Provoni përsëri.',
  oauth_failed: 'Lidhja me Meta dështoi. Provoni përsëri.',
};

export function Channels() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const oauthKey = searchParams.get('oauth') === 'meta' ? searchParams.get('key') : null;
  const oauthError = searchParams.get('oauth_error');

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

  function clearOAuthParams() {
    setSearchParams((prev) => {
      prev.delete('oauth');
      prev.delete('key');
      prev.delete('oauth_error');
      return prev;
    }, { replace: true });
  }

  if (loading) return <div className="page-loading">Duke ngarkuar kanalet…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;

  return (
    <div className="page-channels">
      {oauthError && (
        <div className="auth-error oauth-error-banner" role="alert">
          {OAUTH_ERROR_MESSAGES[oauthError] || oauthError}
          <button type="button" className="oauth-error-dismiss" onClick={clearOAuthParams}>
            Mbyll
          </button>
        </div>
      )}
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
      {oauthKey && (
        <OAuthSelectModal
          oauthKey={oauthKey}
          onClose={clearOAuthParams}
          onConnected={() => {
            clearOAuthParams();
            loadChannels();
          }}
        />
      )}
    </div>
  );
}

function OAuthSelectModal({
  oauthKey,
  onClose,
  onConnected,
}: {
  oauthKey: string;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [data, setData] = useState<OAuthSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<OAuthSelection>(`/api/oauth/meta/selection?key=${encodeURIComponent(oauthKey)}`)
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [oauthKey]);

  function handleConnect(platform: 'facebook' | 'instagram', platformPageId: string, name: string) {
    setConnecting(platformPageId);
    setError('');
    apiRequest<Channel>('/api/oauth/meta/connect', {
      method: 'POST',
      body: JSON.stringify({ oauthKey, platform, platformPageId, name: name || undefined }),
    })
      .then(() => onConnected())
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë lidhjes.'))
      .finally(() => setConnecting(null));
  }

  const hasItems = data && (data.pages.length > 0 || data.instagram.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Lidhni një faqe ose llogari Instagram</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Mbyll">
            ×
          </button>
        </div>
        <div className="modal-form">
          {error && <div className="auth-error">{error}</div>}
          {loading && <p className="page-loading">Duke ngarkuar…</p>}
          {!loading && !hasItems && (
            <p>Nuk u gjetën faqe Facebook ose llogari Instagram. Sigurohuni që keni lidhur një faqe me Instagram Business.</p>
          )}
          {!loading && hasItems && (
            <>
              {data!.pages.length > 0 && (
                <div className="oauth-select-group">
                  <h3>Faqe Facebook (Messenger)</h3>
                  <ul className="oauth-select-list">
                    {data!.pages.map((p) => (
                      <li key={p.id} className="oauth-select-item">
                        <span>{p.name}</span>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={!!connecting}
                          onClick={() => handleConnect('facebook', p.id, p.name)}
                        >
                          {connecting === p.id ? 'Duke lidhur…' : 'Lidh'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data!.instagram.length > 0 && (
                <div className="oauth-select-group">
                  <h3>Instagram</h3>
                  <ul className="oauth-select-list">
                    {data!.instagram.map((ig) => (
                      <li key={ig.id} className="oauth-select-item">
                        <span>@{ig.username} ({ig.pageName})</span>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          disabled={!!connecting}
                          onClick={() => handleConnect('instagram', ig.id, ig.username)}
                        >
                          {connecting === ig.id ? 'Duke lidhur…' : 'Lidh'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Mbyll
            </button>
          </div>
        </div>
      </div>
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

  function startMetaOAuth() {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    window.location.href = `${env.apiUrl}/api/oauth/meta/start?token=${encodeURIComponent(token)}`;
  }

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
          <div className="oauth-connect-block">
            <p className="oauth-connect-hint">Lidhni pa kopjim tokenash (vetëm Facebook dhe Instagram):</p>
            <button type="button" className="btn-primary oauth-connect-btn" onClick={startMetaOAuth}>
              Lidh me Facebook / Instagram
            </button>
          </div>
          <p className="modal-form-divider">— ose shto me token manual —</p>
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
