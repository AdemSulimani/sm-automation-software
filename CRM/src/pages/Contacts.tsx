import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { Contact } from '../types/contact';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function Contacts() {
  const { isAdmin } = useAuth();
  const [adminUserId, setAdminUserId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      apiRequest<UserOption[]>('/api/users')
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (isAdmin && adminUserId) params.set('userId', adminUserId);
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    apiRequest<Contact[]>(`/api/contacts${query}`)
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [isAdmin, adminUserId, search]);

  function displayName(c: Contact): string {
    if (c.name && c.name.trim()) return c.name.trim();
    if (c.email && c.email.trim()) return c.email;
    if (c.phone && c.phone.trim()) return c.phone;
    return 'Kontakt pa emër';
  }

  if (loading) return <div className="page-loading">Duke ngarkuar kontaktet…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;

  return (
    <div className="page-contacts">
      <h1>Kontaktet</h1>
      {isAdmin && users.length > 0 && (
        <div className="inbox-admin-filter">
          <label>
            Sipas klientit:
            <select
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              className="inbox-filter-select"
            >
              <option value="">Të gjithë kontaktet</option>
              {users.filter((u) => u.role === 'client').map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="contacts-toolbar">
        <input
          type="search"
          className="contacts-search"
          placeholder="Kërko sipas emrit, email ose telefonit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="page-contacts-hint">
        Kontaktet krijohen automatikisht kur dikush dërgon mesazh në një nga kanalet tuaja. Mund t’i ndryshoni emrin, email-in dhe telefonin.
      </p>
      {contacts.length === 0 ? (
        <div className="contacts-empty">
          <p>Nuk ka kontakte ende. Kontaktet shtohen kur fillon një bisedë në Inbox.</p>
        </div>
      ) : (
        <ul className="contacts-list">
          {contacts.map((c) => (
            <li key={c._id}>
              <Link to={`/app/contacts/${c._id}`} className="contact-row">
                <span className="contact-name">{displayName(c)}</span>
                {c.email && <span className="contact-email">{c.email}</span>}
                {c.phone && <span className="contact-phone">{c.phone}</span>}
                {c.sentimentLabel && (
                  <span className={`sentiment-badge sentiment-badge--${c.sentimentLabel}`}>
                    {c.sentimentLabel === 'positive'
                      ? 'Pozitiv'
                      : c.sentimentLabel === 'negative'
                      ? 'Negativ'
                      : c.sentimentLabel === 'neutral'
                      ? 'Neutral'
                      : 'I përzier'}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
