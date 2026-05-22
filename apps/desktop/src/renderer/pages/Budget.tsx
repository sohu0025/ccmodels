import { useBudget } from '../hooks/useBudget';
import { useI18n } from '../hooks/useI18n';

export function Budget() {
  const { status, loading, refresh } = useBudget();
  const { t } = useI18n();

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  const pct = status?.usagePct ?? 0;
  const barColor =
    pct >= 100 ? 'bg-danger' : pct >= (status?.thresholdPct ?? 80) ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('budget.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('budget.desc')}</p>
        </div>
        <button onClick={refresh} className="btn btn-primary">{t('budget.refresh')}</button>
      </div>

      {status ? (
        <>
          {/* Monthly overview card */}
          <div className="card card-bordered p-4">
            <h3 className="text-base font-semibold mb-4">{t('budget.monthlyOverview')}{status.month}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('budget.amountUsed')}</p>
                <p className="text-2xl font-bold">${status.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('budget.monthlyLimit')}</p>
                <p className="text-2xl font-bold">${status.limitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">{t('budget.usageRate')}</p>
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
              {t('budget.notification', { pct: status.thresholdPct, status: status.notified ? t('budget.notified') : t('budget.notNotified') })}
            </p>
          </div>

          {/* Settings hint */}
          <div className="card card-bordered p-4">
            <h3 className="text-base font-semibold mb-2">{t('nav.settings')}</h3>
            <p className="text-sm text-text-secondary">
              {t('budget.settingsHint')}
            </p>
          </div>
        </>
      ) : (
        <div className="card card-bordered p-12 text-center">
          <p className="text-lg font-medium text-text-secondary">{t('budget.noData')}</p>
        </div>
      )}
    </div>
  );
}
