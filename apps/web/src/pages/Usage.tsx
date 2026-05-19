import { useEffect, useState } from 'react';
import { api } from '../api';

export function Usage() {
  const [stats, setStats] = useState<any>(null);
  const [byProvider, setByProvider] = useState<any[]>([]);
  const [byModel, setByModel] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.usage.stats().catch(() => null),
      api.usage.byProvider().catch(() => ({ providers: [] })),
      api.usage.byModel().catch(() => ({ models: [] })),
    ]).then(([s, p, m]) => {
      if (s) { setStats(s); setByProvider(p.providers || []); setByModel(m.models || []); }
      else { setError('Failed to load usage data. Ensure backend is running and you are connected.'); }
    });
  }, []);

  if (error) return <div className="p-6"><p className="text-danger">{error}</p></div>;
  if (!stats) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        <div className="stat-card">
          <p className="stat-label">Total Requests</p>
          <p className="stat-value">{stats.totalRequests.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Tokens</p>
          <p className="stat-value">{stats.totalTokens.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total Cost</p>
          <p className="stat-value">${stats.totalCost.toFixed(4)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Monthly Cost</p>
          <p className="stat-value">${stats.monthlyCost.toFixed(4)}</p>
        </div>
      </div>

      {byProvider.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold">By Provider</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary/50">
                <th className="text-left px-5 py-3 font-semibold text-text-secondary">Provider</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Requests</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Tokens</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byProvider.map(p => (
                <tr key={p.providerId} className="hover:bg-accent/5 transition-colors">
                  <td className="px-5 py-3 font-medium">{p.providerId}</td>
                  <td className="px-5 py-3 text-right font-mono">{p.requests.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">{p.totalTokens.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">${p.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byModel.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-base font-semibold">By Model</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary/50">
                <th className="text-left px-5 py-3 font-semibold text-text-secondary">Model</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Requests</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Tokens</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byModel.map(m => (
                <tr key={m.modelId} className="hover:bg-accent/5 transition-colors">
                  <td className="px-5 py-3 font-medium">{m.modelId}</td>
                  <td className="px-5 py-3 text-right font-mono">{m.requests.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">{m.totalTokens.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono">${m.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
