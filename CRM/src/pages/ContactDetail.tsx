import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { Contact, ContactDetail as ContactDetailType } from '../types/contact';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getChannelLabel(ch: ContactDetailType['conversations'][0]['channelId']): string {
  if (!ch) return '–';
  if (typeof ch === 'object' && ch !== null && 'platform' in ch) {
    const platform = (ch as { platform: string }).platform as ChannelPlatform;
    const name = (ch as { name?: string | null }).name;
    if (name) return `${CHANNEL_PLATFORM_LABELS[platform] || platform}: ${name}`;
    return CHANNEL_PLATFORM_LABELS[platform] || platform;
  }
  return '–';
}

export function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const [data, setData] = useState<ContactDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    setError('');
    apiRequest<ContactDetailType>(`/api/contacts/${contactId}`)
      .then((res) => {
        setData(res);
        setName(res.contact.name ?? '');
        setEmail(res.contact.email ?? '');
        setPhone(res.contact.phone ?? '');
        setNotes(res.contact.notes ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [contactId]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    setSaveError('');
    setSubmitting(true);
    apiRequest<Contact>(`/api/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: name.trim() || null, email: email.trim() || null, phone: phone.trim() || null, notes: notes.trim() || '' }),
    })
      .then((updated) => {
        setData((prev) => (prev ? { ...prev, contact: updated } : null));
        setEditing(false);
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.'))
      .finally(() => setSubmitting(false));
  }

  if (loading) return <div className="page-loading">Duke ngarkuar…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;
  if (!data) return null;

  const { contact, identities, conversations } = data;

  return (
    <div className="page-contact-detail">
      <Link to="/app/contacts" className="back-link">← Kontaktet</Link>
      <div className="contact-detail-header">
        <h1>{contact.name?.trim() || contact.email?.trim() || contact.phone?.trim() || 'Kontakt pa emër'}</h1>
      </div>
      {!editing ? (
        <div className="contact-detail-card">
          <dl className="contact-detail-dl">
            <dt>Emër</dt>
            <dd>{contact.name || '–'}</dd>
            <dt>Email</dt>
            <dd>{contact.email || '–'}</dd>
            <dt>Telefon</dt>
            <dd>{contact.phone || '–'}</dd>
            <dt>Shënime</dt>
            <dd>{contact.notes || '–'}</dd>
            <dt>Sentiment (klienti)</dt>
            <dd>
              {contact.sentimentLabel
                ? contact.sentimentLabel === 'positive'
                  ? 'Pozitiv'
                  : contact.sentimentLabel === 'negative'
                  ? 'Negativ'
                  : contact.sentimentLabel === 'neutral'
                  ? 'Neutral'
                  : 'I përzier'
                : 'Pa sentiment'}
            </dd>
          </dl>
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Ndrysho
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="contact-detail-form">
          {saveError && <div className="auth-error">{saveError}</div>}
          <label>
            Emër
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emri" />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@shembull.com" />
          </label>
          <label>
            Telefon
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+355..." />
          </label>
          <label>
            Shënime
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Shënime opsionale" />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Anulo
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Duke ruajtur…' : 'Ruaj'}
            </button>
          </div>
        </form>
      )}
      {identities.length > 0 && (
        <section className="contact-detail-section">
          <h2>Kanale (identitete)</h2>
          <ul className="contact-identities-list">
            {identities.map((id) => {
              const ch = id.channelId;
              const platform = typeof ch === 'object' && ch && 'platform' in ch ? (ch as { platform: string }).platform : '';
              const chName = typeof ch === 'object' && ch && 'name' in ch ? (ch as { name?: string }).name : null;
              return (
                <li key={id._id}>
                  {CHANNEL_PLATFORM_LABELS[platform as ChannelPlatform] || platform}
                  {chName ? `: ${chName}` : ''} — <code>{id.platformUserId}</code>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {conversations.length > 0 && (
        <section className="contact-detail-section">
          <h2>Bisedat</h2>
          <ul className="contact-conversations-list">
            {conversations.map((conv) => (
              <li key={conv._id}>
                <Link to={`/app/inbox/${conv._id}`} className="conversation-link">
                  <span className="conv-channel">{getChannelLabel(conv.channelId)}</span>
                  <span className="conv-date">{formatDate(conv.lastMessageAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
