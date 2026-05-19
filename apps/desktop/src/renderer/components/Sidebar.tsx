import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/providers', label: '供应商', icon: '🔌' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="sidebar flex flex-col py-4">
      <div className="px-4 py-3 mb-4">
        <h1 className="text-lg font-bold">⚡ CC Switch</h1>
        <p className="text-xs opacity-60">AI CLI 管理工具</p>
      </div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs opacity-60">v0.1.0</p>
      </div>
    </aside>
  );
}
