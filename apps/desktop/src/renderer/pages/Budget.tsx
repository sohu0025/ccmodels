import { useBudget } from '../hooks/useBudget';

export function Budget() {
  const { status, loading, refresh } = useBudget();

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  const pct = status?.usagePct ?? 0;
  const barColor =
    pct >= 100 ? 'bg-danger' : pct >= (status?.thresholdPct ?? 80) ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">预算告警</h2>
          <p className="text-sm text-text-secondary mt-1">监控 API 消费，防止超支</p>
        </div>
        <button onClick={refresh} className="btn-primary">刷新</button>
      </div>

      {status ? (
        <>
          {/* Monthly overview card */}
          <div className="card p-6">
            <h3 className="text-base font-semibold mb-5">月度概览 — {status.month}</h3>
            <div className="grid grid-cols-3 gap-5 mb-6">
              <div>
                <p className="text-xs text-text-secondary mb-1">已用金额</p>
                <p className="text-2xl font-bold">${status.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">月度限额</p>
                <p className="text-2xl font-bold">${status.limitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">使用比例</p>
                <p className="text-2xl font-bold">{pct.toFixed(1)}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-bg-tertiary rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-tertiary mt-3">
              通知阈值：{status.thresholdPct}% · {status.notified ? '已发送通知' : '尚未通知'}
            </p>
          </div>

          {/* Settings hint */}
          <div className="card p-6">
            <h3 className="text-base font-semibold mb-2">设置</h3>
            <p className="text-sm text-text-secondary">
              前往"设置"页面配置月度预算上限和通知阈值百分比。
            </p>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium text-text-secondary">暂无预算数据</p>
        </div>
      )}
    </div>
  );
}
