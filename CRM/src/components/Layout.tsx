import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavItemsForRole } from '../config/routes';

/**
 * Layout i përbashkët pas login: header (emër, role, logout) + meny anësore + përmbajtje.
 */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user ? getNavItemsForRole(user.role) : [];

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Klient';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">CRM</span>
        </div>
        <div className="app-header-right">
          <span className="app-user-name">{user?.name ?? 'Përdorues'}</span>
          <span className="app-role-badge" title={`Rol: ${roleLabel}`}>
            {roleLabel}
          </span>
          <button type="button" className="btn-header-logout" onClick={handleLogout}>
            Dil
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end={item.path === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
