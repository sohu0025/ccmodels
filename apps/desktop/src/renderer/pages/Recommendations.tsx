import { useRecommendations } from '../hooks/useRecommendations';
import { useI18n } from '../hooks/useI18n';

export function Recommendations() {
  const { recommendations, loading, generate } = useRecommendations();
  const { t } = useI18n();

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('recommendations.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('recommendations.desc')}</p>
        </div>
        <button onClick={generate} className="btn btn-primary">{t('recommendations.generate')}</button>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="card card-bordered p-12 text-center">
          <p className="text-lg font-medium mb-1">{t('recommendations.emptyTitle')}</p>
          <p className="text-sm text-text-secondary">{t('recommendations.emptyDesc')}</p>
        </div>
      ) : (
        <div className="card card-bordered overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/50">
                <th className="text-left px-5 py-3 font-semibold text-text-secondary w-[15%]">{t('recommendations.colTask')}</th>
                <th className="text-left px-5 py-3 font-semibold text-text-secondary w-[20%]">{t('recommendations.colModel')}</th>
                <th className="text-left px-5 py-3 font-semibold text-text-secondary w-[25%] break-words">{t('recommendations.colReason')}</th>
                <th className="text-right px-5 py-3 font-semibold text-text-secondary w-[12%]">{t('recommendations.colUsage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recommendations.map((r) => (
                <tr key={r.id} className="hover:bg-accent/5 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.taskType}</td>
                  <td className="px-5 py-3 text-xs font-medium leading-relaxed">
                    <span className="whitespace-pre-wrap break-all bg-success/20 text-success px-1.5 py-0.5 rounded" style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
                      {r.recommendedModel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs w-[25%] break-words">{r.reason}</td>
                  <td className="px-5 py-3 text-right font-mono w-[12%]">{r.usageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
