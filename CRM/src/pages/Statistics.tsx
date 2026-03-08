/**
 * Faqe Statistika dhe raport – mesazhe hyrëse/dalëse, kohë përgjigjeje, orar pune.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import type { Channel } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

interface OverviewData {
  messagesIn: number;
  messagesOut: number;
  conversationsCount: number;
  avgResponseTimeMinutes: number | null;
  messagesByDay: Array<{ date: string; in: number; out: number }>;
  workHoursStart: string | null;
  workHoursEnd: string | null;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

function formatDateLabel(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDefaultDateRange() {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: last30.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function Statistics() {
  const { isAdmin } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [adminUserId, setAdminUserId] = useState('');
  const [channelId, setChannelId] = useState('');
  const defaultRange = getDefaultDateRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      apiRequest<UserOption[]>('/api/users')
        .then((list) => setUsers(Array.isArray(list) ? list : []))
        .catch(() => setUsers([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    const query = isAdmin && adminUserId ? `?userId=${encodeURIComponent(adminUserId)}` : '';
    apiRequest<Channel[]>(`/api/channels${query}`)
      .then((list) => setChannels(Array.isArray(list) ? list : []))
      .catch(() => setChannels([]));
    if (channelId && adminUserId) setChannelId('');
  }, [isAdmin, adminUserId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
    if (channelId) params.set('channelId', channelId);
    if (isAdmin && adminUserId) params.set('userId', adminUserId);
    const query = params.toString() ? `?${params.toString()}` : '';
    apiRequest<OverviewData>(`/api/stats/overview${query}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }, [from, to, channelId, isAdmin, adminUserId]);

  return (
    <div className="page-statistics">
      <h1>Statistika dhe raport</h1>
      <p className="page-statistics-hint">
        Mesazhe hyrëse dhe dalëse, kohë mesatare përgjigjeje dhe shpërndarja sipas ditëve.
      </p>

      {isAdmin && users.length > 0 && (
        <div className="statistics-filters">
          <label>
            Sipas klientit:
            <select
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              className="inbox-filter-select"
            >
              <option value="">Të gjitha</option>
              {users.filter((u) => u.role === 'client').map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="statistics-filters">
        <label>
          Nga data
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Deri në datë
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          Kanal
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">Të gjitha</option>
            {channels.map((c) => (
              <option key={c._id} value={c._id}>
                {CHANNEL_PLATFORM_LABELS[c.platform as ChannelPlatform]}
                {c.name ? `: ${c.name}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {loading && <div className="page-loading">Duke ngarkuar…</div>}

      {!loading && data && (
        <>
          <div className="dashboard-stats statistics-cards">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{data.messagesIn}</span>
              <span className="dashboard-stat-label">Mesazhe hyrëse</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{data.messagesOut}</span>
              <span className="dashboard-stat-label">Mesazhe dalëse</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{data.conversationsCount}</span>
              <span className="dashboard-stat-label">Biseda</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">
                {data.avgResponseTimeMinutes != null
                  ? `${data.avgResponseTimeMinutes.toFixed(1)} min`
                  : '–'}
              </span>
              <span className="dashboard-stat-label">Koha mesatare përgjigjeje</span>
            </div>
          </div>

          {(data.workHoursStart || data.workHoursEnd) && (
            <section className="statistics-work-hours">
              <h2>Orar pune (të konfiguruar)</h2>
              <p>
                {data.workHoursStart ?? '–'} – {data.workHoursEnd ?? '–'}
              </p>
              <p className="statistics-work-hours-hint">
                Konfigurohet te <strong>Biznesi im</strong> → Orar pune.
              </p>
            </section>
          )}

          {data.messagesByDay.length > 0 && (
            <section className="statistics-by-day">
              <h2>Mesazhe sipas ditëve</h2>
              <table className="table-statistics">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hyrëse</th>
                    <th>Dalëse</th>
                  </tr>
                </thead>
                <tbody>
                  {data.messagesByDay.map((row) => (
                    <tr key={row.date}>
                      <td>{formatDateLabel(row.date)}</td>
                      <td>{row.in}</td>
                      <td>{row.out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {!loading && data && data.messagesByDay.length === 0 && data.conversationsCount === 0 && (
            <p className="statistics-empty">Nuk ka të dhëna për periudhën e zgjedhur.</p>
          )}
        </>
      )}
    </div>
  );
}
