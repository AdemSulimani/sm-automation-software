import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { Channel } from '../types/channel';
import type { AutomationRule as Rule, AutomationTrigger, AutomationTriggerSource } from '../types/automation';
import { TRIGGER_LABELS, TRIGGER_SOURCE_LABELS } from '../types/automation';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

function getResponsePreview(rule: Rule): string {
  const p = rule.responsePayload;
  if (!p) return '–';
  if (typeof (p as { text?: string }).text === 'string') return (p as { text: string }).text;
  return typeof p === 'object' ? JSON.stringify(p).slice(0, 50) + '…' : '–';
}

function getTriggerValueDisplay(rule: Rule): string {
  if (rule.trigger === 'keyword_regex' && rule.triggerRegex) return rule.triggerRegex;
  if (rule.trigger === 'after_X_min' && rule.triggerValue != null) return `${rule.triggerValue} min`;
  return '–';
}

export function Automation() {
  const { isAdmin } = useAuth();
  const [adminUserId, setAdminUserId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

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
        setChannels(Array.isArray(data) ? data : []);
        setChannelId(data?.length ? (data as Channel[])[0]?._id ?? '' : '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoadingChannels(false));
  }, [isAdmin, adminUserId]);

  useEffect(() => {
    if (!channelId) {
      setRules([]);
      return;
    }
    setLoadingRules(true);
    setError('');
    apiRequest<Rule[]>(`/api/automation-rules?channelId=${encodeURIComponent(channelId)}`)
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoadingRules(false));
  }, [channelId]);

  function handleDelete(rule: Rule) {
    if (!window.confirm('Jeni të sigurt që dëshironi ta fshini këtë rregull?')) return;
    apiRequest(`/api/automation-rules/${rule._id}`, { method: 'DELETE' })
      .then(() => setRules((prev) => prev.filter((r) => r._id !== rule._id)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim gjatë fshirjes.'));
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingRule(null);
    if (channelId) {
      apiRequest<Rule[]>(`/api/automation-rules?channelId=${encodeURIComponent(channelId)}`)
        .then((data) => setRules(Array.isArray(data) ? data : []));
    }
  }

  return (
    <div className="page-automation">
      <h1>Rregulla automation</h1>
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
            setEditingRule(null);
            setShowForm(true);
          }}
          disabled={!channelId}
        >
          Shto rregull
        </button>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {loadingRules ? (
        <div className="page-loading">Duke ngarkuar rregullat…</div>
      ) : !channelId ? (
        <p className="automation-hint">Zgjidhni një kanal për të parë dhe menaxhuar rregullat.</p>
      ) : rules.length === 0 ? (
        <div className="automation-empty">
          <p>Nuk ka rregulla për këtë kanal.</p>
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
            Shto rregull
          </button>
        </div>
      ) : (
        <table className="table-automation">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Burim eventi</th>
              <th>Vlerë / Regex</th>
              <th>Përgjigja</th>
              <th>Prioritet</th>
              <th>Aktiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule._id}>
                <td>{TRIGGER_LABELS[rule.trigger]}</td>
                <td>{TRIGGER_SOURCE_LABELS[rule.triggerSource ?? 'any']}</td>
                <td className="td-value">{getTriggerValueDisplay(rule)}</td>
                <td className="td-response">{getResponsePreview(rule)}</td>
                <td>{rule.priority}</td>
                <td>{rule.active ? 'Po' : 'Jo'}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setEditingRule(rule);
                      setShowForm(true);
                    }}
                  >
                    Ndrysho
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(rule)}
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
        <RuleFormModal
          channelId={channelId}
          channels={channels}
          editingRule={editingRule}
          onClose={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

interface RuleFormModalProps {
  channelId: string;
  channels: Channel[];
  editingRule: Rule | null;
  onClose: () => void;
  onSuccess: () => void;
}

function RuleFormModal({ channelId, channels, editingRule, onClose, onSuccess }: RuleFormModalProps) {
  const [trigger, setTrigger] = useState<AutomationTrigger>(editingRule?.trigger ?? 'keyword_regex');
  const [triggerValue, setTriggerValue] = useState<string>(editingRule?.triggerValue?.toString() ?? '');
  const [triggerRegex, setTriggerRegex] = useState(editingRule?.triggerRegex ?? '');
  const [responseText, setResponseText] = useState(
    editingRule?.responseType === 'text' && editingRule?.responsePayload && typeof (editingRule.responsePayload as { text?: string }).text === 'string'
      ? (editingRule.responsePayload as { text: string }).text
      : ''
  );
  const [priority, setPriority] = useState(editingRule?.priority?.toString() ?? '0');
  const [active, setActive] = useState(editingRule?.active !== false);
  const [triggerSource, setTriggerSource] = useState<AutomationTriggerSource>(
    editingRule?.triggerSource ?? 'any'
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const text = responseText.trim();
    if (!text) {
      setError('Teksti i përgjigjes është i detyrueshëm.');
      return;
    }
    if (trigger === 'keyword_regex' && !triggerRegex.trim()) {
      setError('Fjalët kyçe ose regex janë të detyrueshme për këtë lloj trigger-i.');
      return;
    }
    setSubmitting(true);
    const body = {
      channelId,
      trigger,
      responseType: 'text' as const,
      responsePayload: { text },
      priority: parseInt(priority, 10) || 0,
      active,
      triggerValue: trigger === 'after_X_min' ? parseInt(triggerValue, 10) || null : null,
      triggerRegex: trigger === 'keyword_regex' ? triggerRegex.trim() || null : null,
      triggerSource,
    };
    try {
      if (editingRule) {
        await apiRequest<Rule>(`/api/automation-rules/${editingRule._id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest<Rule>('/api/automation-rules', {
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
          <h2>{editingRule ? 'Ndrysho rregullin' : 'Shto rregull'}</h2>
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
          <label>
            Lloji i trigger-it
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
            >
              <option value="first_message">Mesazhi i parë</option>
              <option value="after_X_min">Pas X minutash</option>
              <option value="keyword_regex">Fjalë kyçe / regex</option>
            </select>
          </label>
          <label>
            Nga cilat evente ndizet
            <select
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value as AutomationTriggerSource)}
            >
              <option value="any">{TRIGGER_SOURCE_LABELS.any}</option>
              <option value="dm">{TRIGGER_SOURCE_LABELS.dm}</option>
              <option value="comment">{TRIGGER_SOURCE_LABELS.comment}</option>
              <option value="button">{TRIGGER_SOURCE_LABELS.button}</option>
            </select>
          </label>
          {trigger === 'after_X_min' && (
            <label>
              Minuta (X)
              <input
                type="number"
                min={1}
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder="p.sh. 5"
              />
            </label>
          )}
          {trigger === 'keyword_regex' && (
            <label>
              Fjalë kyçe ose regex
              <input
                type="text"
                value={triggerRegex}
                onChange={(e) => setTriggerRegex(e.target.value)}
                placeholder="p.sh. çfarë|cmimi|çmimi"
              />
            </label>
          )}
          <label>
            Teksti i përgjigjes <span className="required">*</span>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={3}
              placeholder="Mesazhi që dërgohet kur trigger-i përputhet"
              required
            />
          </label>
          <label>
            Prioritet (më i lartë = kontrollohet më parë)
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
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
              {submitting ? 'Duke ruajtur…' : editingRule ? 'Ruaj ndryshimet' : 'Shto rregull'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
