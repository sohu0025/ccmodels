import { useBudget } from '../hooks/useBudget';

export function Budget() {
  const { status, loading, refresh } = useBudget();

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  const pct = status?.usagePct ?? 0;
  const barColor =
    pct >= 100 ? 'bg-danger' : pct >= (status?.thresholdPct ?? 80) ? 'bg-warning' : 'bg-success';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Budget Alerts</h2>
          <p className="text-sm text-text-secondary mt-1">Monitor API spending and prevent overruns</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
        >
          Refresh
        </button>
      </div>

      {status ? (
        <>
          <div className="rounded-xl border border-border p-6 mb-6">
            <h3 className="font-semibold mb-4">Monthly Overview — {status.month}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-text-secondary mb-1">Used</p>
                <p className="text-2xl font-bold">${status.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Limit</p>
                <p className="text-2xl font-bold">${status.limitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Usage</p>
                <p className="text-2xl font-bold">{pct.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Notification threshold: {status.thresholdPct}% &middot; {status.notified ? 'Notified' : 'Not notified'}
            </p>
          </div>

          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-2">Settings</h3>
            <p className="text-sm text-text-secondary mb-4">
              Go to the Settings page to configure your monthly budget limit and notification threshold percentage.
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-lg">No budget data available</p>
        </div>
      )}
    </div>
  );
}
