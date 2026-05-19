import { useEffect, useState } from 'react';
import { api } from '../api';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  useEffect(() => {
    api.usage.stats().then(setStats).catch(() => {});
    api.providers.list().then(setProviders).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <div className="stat-card">
          <p className="stat-label">Total Requests</p>
          <p className="stat-value">{stats?.totalRequests?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Tokens</p>
          <p className="stat-value">{stats?.totalTokens?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Cost</p>
          <p className="stat-value">${stats?.totalCost?.toFixed(4) ?? '—'}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Providers</p>
          <p className="stat-value">{stats?.activeProviders ?? '—'}</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold mb-4">已配置供应商</h3>
        {providers.length === 0 ? (
          <p className="text-sm text-text-secondary">暂无供应商，请在桌面端添加并同步</p>
        ) : (
          <div className="divide-y divide-border">
            {providers.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-text-tertiary ml-2">{p.apiBase}</span>
                </div>
                {p.isActive && <span className="badge badge-success">当前</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
