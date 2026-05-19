import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '仪表盘', icon: '◉' },
  { to: '/usage', label: '用量成本', icon: '◎' },
  { to: '/sessions', label: '会话历史', icon: '◈' },
  { to: '/speed-test', label: '供应商测速', icon: '⚡' },
  { to: '/mcp', label: 'MCP 管理', icon: '⬡' },
  { to: '/skills', label: 'Skills', icon: '✦' },
  { to: '/prompts', label: 'Prompts', icon: '◐' },
  { to: '/compare', label: '模型对比', icon: '⚖' },
  { to: '/recommendations', label: '智能推荐', icon: '✧' },
  { to: '/budget', label: '预算告警', icon: '◔' },
  { to: '/providers', label: '供应商', icon: '⬢' },
  { to: '/settings', label: '设置', icon: '⚙' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">CC Switch</h1>
            <p className="text-xs text-text-tertiary leading-none">AI CLI Manager</p>
          </div>
        </div>
      </div>

      <div className="sidebar-title">导航</div>
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
            <span className="text-sm w-4 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-text-tertiary">v0.1.0</p>
      </div>
    </aside>
  );
}
