import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { Channel } from '../types/channel';
import type { KeywordResponse as KwResp } from '../types/keywordResponse';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

function getMatchDisplay(kr: KwResp): string {
  if (kr.keywordRegex && kr.keywordRegex.trim()) return kr.keywordRegex;
  if (kr.keywords?.length) return kr.keywords.slice(0, 3).join(', ') + (kr.keywords.length > 3 ? '…' : '');
  return '–';
}

function getResponsePreview(kr: KwResp): string {
  if (kr.responseText && kr.responseText.trim()) return kr.responseText.slice(0, 60) + (kr.responseText.length > 60 ? '…' : '');
  const p = kr.responsePayload;
  if (p && typeof p === 'object' && typeof (p as { text?: string }).text === 'string')
    return ((p as { text: string }).text).slice(0, 60) + '…';
  return '–';
}

export function KeywordResponses() {
  const { isAdmin } = useAuth();
  const [adminUserId, setAdminUserId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [responses, setResponses] = useState<KwResp[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<KwResp | null>(null);

  useEffect(() => {
    if (isAdmin) {
      apiRequest<UserOption[]>('/api/users')
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoadingChannels(true);
    setError('');
    const query = isAdmin && adminUserId ? `?userId=${encodeURIComponent(adminUserId)}` : '';
    apiRequest<Channel[]>(`/api/channels${query}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setChannels(list);
        setChannelId(list.length ? (list[0] as Channel)._id : '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoadingChannels(false));
  }, [isAdmin, adminUserId]);

  useEffect(() => {
    if (!channelId) {
      setResponses([]);
      return;
    }
    setLoadingResponses(true);
    setError('');
    apiRequest<KwResp[]>(`/api/keyword-responses?channelId=${encodeURIComponent(channelId)}`)
      .then((data) => setResponses(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoadingResponses(false));
  }, [channelId]);

  function handleDelete(item: KwResp) {
    if (!window.confirm('Jeni të sigurt që dëshironi ta fshini këtë përgjigje me fjalë kyçe?')) return;
    apiRequest(`/api/keyword-responses/${item._id}`, { method: 'DELETE' })
      .then(() => setResponses((prev) => prev.filter((r) => r._id !== item._id)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë fshirjes.'));
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingItem(null);
    if (channelId) {
      apiRequest<KwResp[]>(`/api/keyword-responses?channelId=${encodeURIComponent(channelId)}`)
        .then((data) => setResponses(Array.isArray(data) ? data : []));
    }
  }

  return (
    <div className="page-keyword-responses">
      <h1>Përgjigje me fjalë kyçe</h1>
      {isAdmin && users.length > 0 && (
        <div className="automation-admin-filter">
          <label>
            Klienti:
            <select
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              className="inbox-filter-select"
            >
              <option value="">Unë (admin)</option>
              {users.filter((u) => u.role === 'client').map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="automation-channel-row">
        <label>
          Kanal:
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            disabled={loadingChannels || channels.length === 0}
          >
            <option value="">Zgjidhni kanalin</option>
            {channels.map((c) => (
              <option key={c._id} value={c._id}>
                {CHANNEL_PLATFORM_LABELS[c.platform as ChannelPlatform]}
                {c.name ? `: ${c.name}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          disabled={!channelId}
        >
          Shto përgjigje
        </button>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {loadingResponses ? (
        <div className="page-loading">Duke ngarkuar përgjigjet…</div>
      ) : !channelId ? (
        <p className="automation-hint">Zgjidhni një kanal për të parë dhe menaxhuar përgjigjet me fjalë kyçe.</p>
      ) : responses.length === 0 ? (
        <div className="automation-empty">
          <p>Nuk ka përgjigje me fjalë kyçe për këtë kanal.</p>
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            Shto përgjigje
          </button>
        </div>
      ) : (
        <table className="table-automation">
          <thead>
            <tr>
              <th>Fjalë kyçe / Regex</th>
              <th>Përgjigja</th>
              <th>E ndjeshme ndaj shkronjave</th>
              <th>Aktiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {responses.map((kr) => (
              <tr key={kr._id}>
                <td className="td-value">{getMatchDisplay(kr)}</td>
                <td className="td-response">{getResponsePreview(kr)}</td>
                <td>{kr.caseSensitive ? 'Po' : 'Jo'}</td>
                <td>{kr.active ? 'Po' : 'Jo'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setEditingItem(kr);
                      setShowForm(true);
                    }}
                  >
                    Ndrysho
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(kr)}
                  >
                    Fshi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && channelId && (
        <KeywordResponseFormModal
          channelId={channelId}
          channels={channels}
          editingItem={editingItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

interface KeywordResponseFormModalProps {
  channelId: string;
  channels: Channel[];
  editingItem: KwResp | null;
  onClose: () => void;
  onSuccess: () => void;
}

function KeywordResponseFormModal({
  channelId,
  channels,
  editingItem,
  onClose,
  onSuccess,
}: KeywordResponseFormModalProps) {
  const [useRegex, setUseRegex] = useState(!!(editingItem?.keywordRegex && editingItem.keywordRegex.trim()));
  const [keywordsText, setKeywordsText] = useState(
    editingItem?.keywords?.length ? editingItem.keywords.join(', ') : ''
  );
  const [keywordRegex, setKeywordRegex] = useState(editingItem?.keywordRegex ?? '');
  const [responseText, setResponseText] = useState(
    editingItem?.responseText ?? (editingItem?.responsePayload && typeof (editingItem.responsePayload as { text?: string }).text === 'string'
      ? (editingItem.responsePayload as { text: string }).text
      : '')
  );
  const [caseSensitive, setCaseSensitive] = useState(editingItem?.caseSensitive ?? false);
  const [active, setActive] = useState(editingItem?.active !== false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveUseRegex = editingItem ? !!(editingItem.keywordRegex && editingItem.keywordRegex.trim()) : useRegex;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const text = responseText.trim();
    if (!text) {
      setError('Teksti i përgjigjes është i detyrueshëm.');
      return;
    }
    if (effectiveUseRegex) {
      if (!keywordRegex.trim()) {
        setError('Regex për fjalë kyçe është i detyrueshëm kur përdorni regex.');
        return;
      }
      try {
        new RegExp(keywordRegex);
      } catch {
        setError('Regex i pavlefshëm.');
        return;
      }
    } else {
      const kw = keywordsText.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
      if (kw.length === 0) {
        setError('Vendosni të paktën një fjalë kyçe (të ndara me presje ose rresht të ri).');
        return;
      }
    }

    setSubmitting(true);
    const keywords = effectiveUseRegex ? [] : keywordsText.split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);
    const body = {
      channelId,
      keywords,
      keywordRegex: effectiveUseRegex ? keywordRegex.trim() : null,
      responseText: text,
      caseSensitive,
      active,
    };
    try {
      if (editingItem) {
        await apiRequest<KwResp>(`/api/keyword-responses/${editingItem._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest<KwResp>('/api/keyword-responses', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingItem ? 'Ndrysho përgjigjen' : 'Shto përgjigje me fjalë kyçe'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Mbyll">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="auth-error">{error}</div>}
          <label>
            Kanal
            <select value={channelId} disabled>
              {channels.map((c) => (
                <option key={c._id} value={c._id}>
                  {CHANNEL_PLATFORM_LABELS[c.platform as ChannelPlatform]}
                  {c.name ? `: ${c.name}` : ''}
                </option>
              ))}
            </select>
          </label>
          {!editingItem && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              />
              Përdor regex (në vend të listës së fjalëve kyçe)
            </label>
          )}
          {effectiveUseRegex ? (
            <label>
              Regex për përputhje <span className="required">*</span>
              <input
                type="text"
                value={keywordRegex}
                onChange={(e) => setKeywordRegex(e.target.value)}
                placeholder="p.sh. çmimi|cmimi|çfarë kushton"
              />
            </label>
          ) : (
            <label>
              Fjalë kyçe <span className="required">*</span>
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="të ndara me presje, p.sh. çmimi, cmimi, çfarë kushton"
              />
            </label>
          )}
          <label>
            Teksti i përgjigjes <span className="required">*</span>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder="Mesazhi që dërgohet kur përputhet fjala kyçe"
              required
            />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
            E ndjeshme ndaj shkronjave (përputhje me shkronja të mëdha të vogla)
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Aktiv
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anulo
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Duke ruajtur…' : editingItem ? 'Ruaj ndryshimet' : 'Shto përgjigje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
