import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const pageTitleMap: Record<string, string> = {
  '/': '仪表盘',
  '/usage': '用量成本',
  '/sessions': '会话历史',
  '/speed-test': '供应商测速',
  '/mcp': 'MCP 管理',
  '/skills': 'Skills',
  '/prompts': 'Prompts',
  '/compare': '模型对比',
  '/recommendations': '智能推荐',
  '/budget': '预算告警',
  '/providers': '供应商',
  '/settings': '设置',
};

export function Layout() {
  const location = useLocation();
  const title = pageTitleMap[location.pathname] || 'CC Switch';

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="page-header flex items-center justify-between">
          <h1 className="section-title">{title}</h1>
        </header>
        <main className="flex-1 overflow-auto page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
