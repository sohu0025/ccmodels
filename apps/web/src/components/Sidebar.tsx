interface SidebarProps {
  onLogout?: () => void;
}

const navItems = [
  { to: '/', label: '仪表盘', icon: '◉' },
  { to: '/usage', label: '用量成本', icon: '◎' },
  { to: '/sessions', label: '会话历史', icon: '◈' },
  { to: '/compare', label: '模型对比', icon: '⚖' },
  { to: '/settings', label: '设置', icon: '⚙' },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const path = window.location.pathname;
  return (
    <aside className="sidebar">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold">⚡</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">CC Switch</h1>
            <p className="text-xs text-text-tertiary leading-none">Web Dashboard</p>
          </div>
        </div>
      </div>

      <div className="sidebar-title">导航</div>
      <nav className="flex-1">
        {navItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={`sidebar-item ${path === item.to ? 'active' : ''}`}
          >
            <span className="text-sm w-4 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {onLogout && (
        <div className="px-5 py-4 border-t border-border">
          <button onClick={onLogout} className="sidebar-item text-danger">
            <span className="text-sm w-4 text-center">⏻</span>
            <span>退出登录</span>
          </button>
        </div>
      )}
    </aside>
  );
}
