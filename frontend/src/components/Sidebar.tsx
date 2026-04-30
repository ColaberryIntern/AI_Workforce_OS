import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  permission?: string;
  role?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: 'Workforce',
    items: [
      { to: '/hr-dashboard', label: 'HR Dashboard' },
      { to: '/operations-dashboard', label: 'Operations' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/executive-dashboard', label: 'Executive view' },
      { to: '/value-proposition', label: 'Value proposition' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/roles', label: 'Roles & permissions', permission: 'role.read' },
      { to: '/audit', label: 'Audit log', permission: 'audit.read' },
      { to: '/notifications', label: 'Notifications' },
      { to: '/webhooks', label: 'Webhooks', permission: 'webhook.read' },
      { to: '/it-admin', label: 'IT admin' },
    ],
  },
];

export function Sidebar() {
  const { user, hasPermission } = useAuth();

  return (
    <nav
      className="col-lg-2 col-md-3 d-md-block bg-alt p-3 border-end"
      aria-label="Section navigation"
      style={{ minHeight: 'calc(100vh - 56px)' }}
    >
      {groups.map((g) => {
        const visible = g.items.filter(
          (it) => !it.permission || (user && hasPermission(it.permission)),
        );
        if (visible.length === 0) return null;
        return (
          <div key={g.label} className="mb-4">
            <h6 className="text-uppercase muted fw-semibold mb-2 small">{g.label}</h6>
            <ul className="nav flex-column">
              {visible.map((item) => (
                <li key={item.to} className="nav-item">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-link px-2 py-1 ${isActive ? 'fw-semibold text-primary' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
