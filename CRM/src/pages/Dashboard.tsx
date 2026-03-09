import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface Stats {
  usersCount?: number;
  channelsCount?: number;
}

interface RateLimitChannelStat {
  channelId: string;
  name: string | null;
  platform: string;
  messagesOutLastHour: number;
  pendingJobs: number;
  rateLimitedJobs: number;
}

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channelsCount, setChannelsCount] = useState(0);
  const [conversationsCount, setConversationsCount] = useState(0);
  const [adminStats, setAdminStats] = useState<Stats>({});
  const [rateStats, setRateStats] = useState<RateLimitChannelStat[]>([]);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        apiRequest<{ usersCount: number; channelsCount: number }>('/api/stats'),
        apiRequest<RateLimitChannelStat[]>('/api/stats/rate-limit'),
      ])
        .then(([adminData, rateData]) => {
          setAdminStats({ usersCount: adminData.usersCount, channelsCount: adminData.channelsCount });
          setRateStats(Array.isArray(rateData) ? rateData : []);
        })
        .catch(() => {
          setAdminStats({});
          setRateStats([]);
        })
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        apiRequest<unknown[]>('/api/channels'),
        apiRequest<unknown[]>('/api/conversations'),
      ])
        .then(([channels, conversations]) => {
          setChannelsCount(Array.isArray(channels) ? channels.length : 0);
          setConversationsCount(Array.isArray(conversations) ? conversations.length : 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  if (loading) {
    return <div className="page-loading">Duke ngarkuar…</div>;
  }

  return (
    <div className="dashboard">
      <h1>Paneli</h1>
      <p className="dashboard-welcome">Mirë se erdhe, {user?.name ?? 'përdorues'}.</p>

      {isAdmin ? (
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{adminStats.usersCount ?? 0}</span>
              <span className="dashboard-stat-label">Klientë</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{adminStats.channelsCount ?? 0}</span>
              <span className="dashboard-stat-label">Kanale (gjithsej)</span>
            </div>
          </div>
          {rateStats.length > 0 && (
            <div className="dashboard-rate-limit">
              <h2>Rate limit Meta (60 minutat e fundit)</h2>
              <table className="table-automation">
                <thead>
                  <tr>
                    <th>Kanal</th>
                    <th>Mesazhe OUT (60 min)</th>
                    <th>Jobs pending</th>
                    <th>Rate limited</th>
                  </tr>
                </thead>
                <tbody>
                  {rateStats.map((r) => (
                    <tr key={r.channelId}>
                      <td>
                        {r.platform.toUpperCase()}
                        {r.name ? `: ${r.name}` : ''}
                      </td>
                      <td>{r.messagesOutLastHour}</td>
                      <td>{r.pendingJobs}</td>
                      <td>{r.rateLimitedJobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="dashboard-shortcuts">
            <Link to="/app/klientet" className="dashboard-shortcut">
              Shiko klientët
            </Link>
            <Link to="/app/inbox" className="dashboard-shortcut">
              Inbox
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{channelsCount}</span>
              <span className="dashboard-stat-label">Kanale</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="dashboard-stat-value">{conversationsCount}</span>
              <span className="dashboard-stat-label">Biseda</span>
            </div>
          </div>
          <div className="dashboard-shortcuts">
            <Link to="/app/inbox" className="dashboard-shortcut">
              Inbox
            </Link>
            <Link to="/app/settings" className="dashboard-shortcut">
              Cilësime
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
