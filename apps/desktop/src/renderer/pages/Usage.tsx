import { useState } from 'react';
import { useUsage } from '../hooks/useUsage';
import { DailyCostChart, TokenChart, ProviderPieChart } from '../components/UsageChart';
import { useI18n } from '../hooks/useI18n';

export function Usage() {
  const { stats, dailyUsage, providerUsage, modelUsage, loading, refresh } = useUsage();
  const { t } = useI18n();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const handleFilter = () => refresh(dateFrom, dateTo);

  if (loading && !stats) return <div className="text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="flex items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input input-bordered" />
        <span className="text-text-secondary">&mdash;</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input input-bordered" />
        <button onClick={handleFilter} className="btn btn-primary">{t('usage.filter')}</button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="stat-label">Total Tokens</p>
            <p className="stat-value">{(stats.totalTokens / 1_000_000).toFixed(2)}M</p>
            <p className="text-xs text-text-tertiary mt-1">{stats.totalRequests.toLocaleString()} requests</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Total Cost</p>
            <p className="stat-value">${stats.totalCost.toFixed(4)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Cache Hit Rate</p>
            <p className="stat-value">{(stats.cacheHitRate * 100).toFixed(1)}%</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Avg Cost/Req</p>
            <p className="stat-value">
              ${stats.totalRequests > 0 ? (stats.totalCost / stats.totalRequests).toFixed(6) : '0'}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="card card-bordered p-4">
        <h3 className="text-base font-semibold mb-4">Daily Cost</h3>
        <DailyCostChart data={dailyUsage} />
      </div>

      <div className="card card-bordered p-4">
        <h3 className="text-base font-semibold mb-4">Token Trend</h3>
        <TokenChart data={dailyUsage} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card card-bordered p-4">
          <h3 className="text-base font-semibold mb-4">Provider Cost</h3>
          {providerUsage.length > 0 ? (
            <ProviderPieChart data={providerUsage} />
          ) : (
            <p className="text-sm text-text-secondary">{t('common.noData')}</p>
          )}
        </div>
        <div className="card card-bordered p-4">
          <h3 className="text-base font-semibold mb-4">Model Usage Ranking</h3>
          {modelUsage.length > 0 ? (
            <div className="divide-y divide-border">
              {modelUsage.slice(0, 10).map((m, i) => (
                <div key={m.modelId} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary w-5">{i + 1}.</span>
                    <span className="text-sm">{m.providerName}/{m.modelId}</span>
                  </div>
                  <span className="text-sm font-mono text-text-secondary">${m.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">{t('common.noData')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
