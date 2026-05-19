const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/usage', label: 'Usage & Cost', icon: '💰' },
  { to: '/sessions', label: 'Sessions', icon: '💬' },
  { to: '/compare', label: 'Compare', icon: '⚖️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const path = window.location.pathname;
  return (
    <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
      <h1 className="text-lg font-bold mb-6 px-3">CC Switch</h1>
      {navItems.map((item) => (
        <a key={item.to} href={item.to}
          className={`px-3 py-2 rounded-lg text-sm ${path === item.to ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
          {item.icon} {item.label}
        </a>
      ))}
    </nav>
  );
}
