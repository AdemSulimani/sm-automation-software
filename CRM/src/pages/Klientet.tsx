/**
 * Faqe vetëm për admin: lista e klientëve (përdoruesve).
 * API: GET /api/users (admin only).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function Klientet() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest<UserRow[]>('/api/users')
      .then((data) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gabim në ngarkim.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="page-loading">Duke ngarkuar klientët…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;

  return (
    <div className="page-klientet">
      <h1>Klientët</h1>
      <table className="table-klientet">
        <thead>
          <tr>
            <th>Emër</th>
            <th>Email</th>
            <th>Rol</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {u.role === 'client' && (
                  <Link to={`/klientet/${u._id}/cilesime`} className="link-settings">
                    Cilësime
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p>Nuk ka përdorues.</p>}
    </div>
  );
}
