import { useState, useEffect } from 'react';
import { useProviders } from '../hooks/useProviders';

const api = (window as any).electronAPI;

export function Dashboard() {
  const { providers } = useProviders();
  const [proxyStatus, setProxyStatus] = useState({ running: false, port: 15721, requests: 0 });
  const activeProvider = providers.find((p) => p.isActive);

  useEffect(() => {
    const load = async () => {
      const status = await api.getProxyStatus();
      setProxyStatus(status);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">仪表盘</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">代理状态</p>
          <p className="text-2xl font-bold">
            <span className={proxyStatus.running ? 'text-success' : 'text-danger'}>
              {proxyStatus.running ? '●' : '○'}
            </span>{' '}
            {proxyStatus.running ? '运行中' : '已停止'}
          </p>
          <p className="text-xs text-text-secondary mt-1">端口 {proxyStatus.port}</p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">当前供应商</p>
          <p className="text-2xl font-bold">{activeProvider?.name ?? '—'}</p>
          <p className="text-xs text-text-secondary mt-1 truncate">{activeProvider?.apiBase ?? '未配置'}</p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">今日请求</p>
          <p className="text-2xl font-bold">{proxyStatus.requests}</p>
          <p className="text-xs text-text-secondary mt-1">总计 {proxyStatus.requests}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">已配置供应商</h3>
        {providers.length === 0 ? (
          <p className="text-sm text-text-secondary">暂无供应商，前往"供应商"页面添加</p>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-text-secondary ml-2">{p.apiBase}</span>
                </div>
                {p.isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">当前</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
