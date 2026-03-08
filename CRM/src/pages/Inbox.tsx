import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { Conversation, ConversationContact } from '../types/inbox';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDisplayUser(conv: Conversation): string {
  const c = conv.contactId;
  if (c && typeof c === 'object' && 'name' in c && (c as ConversationContact).name)
    return (c as ConversationContact).name!;
  return conv.platformUserId;
}

function getChannelLabel(conv: Conversation): string {
  const ch = conv.channelId;
  if (!ch) return '–';
  if (typeof ch === 'object' && ch !== null && 'platform' in ch) {
    const platform = (ch as { platform: string }).platform as ChannelPlatform;
    const name = (ch as { name?: string | null }).name;
    if (name) return `${CHANNEL_PLATFORM_LABELS[platform] || platform}: ${name}`;
    return CHANNEL_PLATFORM_LABELS[platform] || platform;
  }
  return '–';
}

export function Inbox() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get('channelId') ?? undefined;
  const [adminUserId, setAdminUserId] = useState<string>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
    if (channelId) params.set('channelId', channelId);
    if (isAdmin && adminUserId) params.set('userId', adminUserId);
    const query = params.toString() ? `?${params.toString()}` : '';
    apiRequest<Conversation[]>(`/api/conversations${query}`)
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [channelId, isAdmin, adminUserId]);

  if (loading) return <div className="page-loading">Duke ngarkuar bisedat…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;

  return (
    <div className="page-inbox">
      <h1>Inbox</h1>
      {isAdmin && users.length > 0 && (
        <div className="inbox-admin-filter">
          <label>
            Sipas klientit:
            <select
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              className="inbox-filter-select"
            >
              <option value="">Të gjitha bisedat</option>
              {users.filter((u) => u.role === 'client').map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="page-inbox-hint">
        Zgjidhni një bisedë për të parë historikun dhe për t’u përgjigjur.
      </p>
      {conversations.length === 0 ? (
        <div className="inbox-empty">
          <p>Nuk ka biseda ende.</p>
        </div>
      ) : (
        <ul className="conversations-list">
          {conversations.map((conv) => (
            <li key={conv._id}>
              <Link to={`/app/inbox/${conv._id}`} className="conversation-row">
                <span className="conv-user">{getDisplayUser(conv)}</span>
                <span className="conv-channel">{getChannelLabel(conv)}</span>
                <span className="conv-date">{formatDate(conv.lastMessageAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
