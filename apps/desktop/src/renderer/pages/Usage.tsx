import { useState } from 'react';
import { useUsage } from '../hooks/useUsage';
import { DailyCostChart, TokenChart, ProviderPieChart } from '../components/UsageChart';

export function Usage() {
  const { stats, dailyUsage, providerUsage, modelUsage, loading, refresh } = useUsage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const handleFilter = () => refresh(dateFrom, dateTo);

  if (loading && !stats) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Usage & Cost</h2>
          <p className="text-sm text-text-secondary mt-1">View token consumption and cost statistics</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-bg-primary text-sm"
        />
        <span className="text-text-secondary">&mdash;</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-bg-primary text-sm"
        />
        <button
          onClick={handleFilter}
          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
        >
          Filter
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">Total Tokens</p>
            <p className="text-2xl font-bold">{(stats.totalTokens / 1_000_000).toFixed(2)}M</p>
            <p className="text-xs text-text-secondary mt-1">{stats.totalRequests} requests</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">Total Cost</p>
            <p className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">Cache Hit Rate</p>
            <p className="text-2xl font-bold">{(stats.cacheHitRate * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">Avg Cost/Req</p>
            <p className="text-2xl font-bold">
              ${stats.totalRequests > 0 ? (stats.totalCost / stats.totalRequests).toFixed(6) : '0'}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Daily Cost</h3>
          <DailyCostChart data={dailyUsage} />
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Token Trend</h3>
          <TokenChart data={dailyUsage} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Provider Cost Distribution</h3>
          {providerUsage.length > 0 ? (
            <ProviderPieChart data={providerUsage} />
          ) : (
            <p className="text-sm text-text-secondary">No data yet</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Model Usage Ranking</h3>
          {modelUsage.length > 0 ? (
            <div className="space-y-2">
              {modelUsage.slice(0, 10).map((m, i) => (
                <div
                  key={m.modelId}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-5">{i + 1}.</span>
                    <span className="text-sm">
                      {m.providerName}/{m.modelId}
                    </span>
                  </div>
                  <span className="text-sm font-mono">${m.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
