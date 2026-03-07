import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

interface Stats {
  usersCount?: number;
  channelsCount?: number;
}

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channelsCount, setChannelsCount] = useState(0);
  const [conversationsCount, setConversationsCount] = useState(0);
  const [adminStats, setAdminStats] = useState<Stats>({});

  useEffect(() => {
    if (isAdmin) {
      apiRequest<{ usersCount: number; channelsCount: number }>('/api/stats')
        .then((data) => setAdminStats({ usersCount: data.usersCount, channelsCount: data.channelsCount }))
        .catch(() => setAdminStats({}))
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
          <div className="dashboard-shortcuts">
            <Link to="/klientet" className="dashboard-shortcut">
              Shiko klientët
            </Link>
            <Link to="/inbox" className="dashboard-shortcut">
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
            <Link to="/inbox" className="dashboard-shortcut">
              Inbox
            </Link>
            <Link to="/settings" className="dashboard-shortcut">
              Cilësime
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
