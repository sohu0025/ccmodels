import { useEffect, useState } from 'react';
import { api } from '../api';

export function Usage() {
  const [stats, setStats] = useState<any>(null);
  const [byProvider, setByProvider] = useState<any[]>([]);
  const [byModel, setByModel] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.usage.stats().catch(() => null),
      api.usage.byProvider().catch(() => []),
      api.usage.byModel().catch(() => []),
      api.usage.daily().catch(() => []),
    ]).then(([s, p, m, d]) => {
      if (s) { setStats(s); setByProvider(p?.providers || []); setByModel(m?.models || []); setDaily(d?.daily || []); }
      else { setError('Failed to load usage data. Ensure backend is running and you are connected.'); }
    });
  }, []);

  if (error) return <div className="p-8"><p className="text-red-500">{error}</p></div>;
  if (!stats) return <div className="p-8"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Usage & Cost</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Total Tokens</p>
          <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Monthly Cost</p>
          <p className="text-2xl font-bold">${stats.monthlyCost.toFixed(4)}</p>
        </div>
      </div>

      {byProvider.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-bold mb-3">By Provider</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Provider</th><th className="text-right">Requests</th><th className="text-right">Tokens</th><th className="text-right">Cost</th></tr></thead>
            <tbody>
              {byProvider.map(p => (
                <tr key={p.providerId} className="border-b">
                  <td className="py-2">{p.providerId}</td>
                  <td className="text-right">{p.requests.toLocaleString()}</td>
                  <td className="text-right">{p.totalTokens.toLocaleString()}</td>
                  <td className="text-right">${p.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byModel.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold mb-3">By Model</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Model</th><th className="text-right">Requests</th><th className="text-right">Tokens</th><th className="text-right">Cost</th></tr></thead>
            <tbody>
              {byModel.map(m => (
                <tr key={m.modelId} className="border-b">
                  <td className="py-2">{m.modelId}</td>
                  <td className="text-right">{m.requests.toLocaleString()}</td>
                  <td className="text-right">{m.totalTokens.toLocaleString()}</td>
                  <td className="text-right">${m.totalCost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
