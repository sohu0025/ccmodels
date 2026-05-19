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
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-5">
        <div className="stat-card">
          <p className="stat-label">代理状态</p>
          <div className="flex items-center gap-2">
            <span className={`indicator ${proxyStatus.running ? 'indicator-success' : 'indicator-danger'}`} />
            <p className="stat-value">{proxyStatus.running ? '运行中' : '已停止'}</p>
          </div>
          <p className="text-xs text-text-tertiary mt-1">端口 {proxyStatus.port}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">当前供应商</p>
          <p className="stat-value">{activeProvider?.name ?? '—'}</p>
          <p className="text-xs text-text-tertiary mt-1 truncate">{activeProvider?.apiBase ?? '未配置'}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">今日请求</p>
          <p className="stat-value">{proxyStatus.requests.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">总计 {proxyStatus.requests.toLocaleString()}</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold mb-4">已配置供应商</h3>
        {providers.length === 0 ? (
          <p className="text-sm text-text-secondary">暂无供应商，前往"供应商"页面添加</p>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-text-tertiary ml-2">{p.apiBase}</span>
                </div>
                {p.isActive && (
                  <span className="badge badge-success">当前</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
