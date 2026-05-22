interface SidebarProps {
  onLogout?: () => void;
}

const navItems = [
  { to: '/', label: '首页', icon: '◉' },
  { to: '/admin/providers', label: '系统供应商', icon: '☰' },
  { to: '/admin/ads', label: '广告管理', icon: '📢' },
  { to: '/admin/settings', label: '系统设置', icon: '⚙' },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const path = window.location.pathname;
  return (
    <aside className="sidebar">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">CC</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">CC Models</h1>
            <p className="text-xs text-text-tertiary leading-none mt-0.5">管理后台</p>
          </div>
        </div>
      </div>

      <div className="sidebar-title">管理</div>
      <nav className="flex-1 px-1">
        {navItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            className={`sidebar-item ${path === item.to ? 'active' : ''}`}
          >
            <span className="text-sm w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {onLogout && (
        <div className="px-3 py-3 border-t border-border">
          <button onClick={onLogout} className="sidebar-item text-danger w-full">
            <span className="text-sm w-5 text-center">⏻</span>
            <span>退出登录</span>
          </button>
        </div>
      )}
    </aside>
  );
}
