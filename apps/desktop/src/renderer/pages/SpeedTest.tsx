import { useState } from 'react';
import { useSpeedTests } from '../hooks/useSpeedTests';
import { useProviders } from '../hooks/useProviders';
import { useI18n } from '../hooks/useI18n';

export function SpeedTest() {
  const { results, loading, refresh } = useSpeedTests();
  const { providers } = useProviders();
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);

  const providerMap = new Map(providers.map((p: any) => [p.id, p]));

  const runTest = async () => {
    setTesting(true);
    try {
      await (window as any).electronAPI.runSpeedTest();
      await new Promise(r => setTimeout(r, 3000));
      await refresh();
    } catch (err) {
      console.error('Speed test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">{t('common.loading')}</div>;

  const successCount = results.filter((r: any) => r.success).length;
  const successRate = results.length > 0 ? (successCount / results.length) * 100 : 0;
  const avgLatency =
    successCount > 0
      ? results.filter((r: any) => r.success).reduce((a: number, r: any) => a + r.latencyMs, 0) / successCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('speedTest.title')}</h2>
          <p className="text-sm text-text-secondary mt-1">{t('speedTest.desc')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runTest} disabled={testing} className="btn border border-border bg-white text-text-primary hover:bg-bg-secondary">
            {testing ? '测试中…' : '开始测速'}
          </button>
          <button onClick={refresh} className="btn btn-primary">{t('speedTest.refresh')}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        <div className="stat-card">
          <p className="stat-label">{t('speedTest.statsTests')}</p>
          <p className="stat-value">{results.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('speedTest.statsLatency')}</p>
          <p className="stat-value">{avgLatency.toFixed(0)}ms</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t('speedTest.statsSuccess')}</p>
          <p className="stat-value">{successRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* History */}
      <div className="card card-bordered overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">{t('speedTest.historyTitle')}</h3>
        </div>
        {results.length === 0 ? (
          <div className="p-10 text-center text-text-secondary text-sm">
            {testing ? '测试中，请稍候…' : '暂无数据，点击上方「开始测速」测试所有已配置供应商的延迟'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {results.map((r: any) => {
              const p = providerMap.get(r.providerId);
              return (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`indicator shrink-0 ${r.success ? 'indicator-success' : 'indicator-danger'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p?.name ?? r.providerId.slice(0, 8)}</p>
                      <p className="text-xs text-text-tertiary truncate">
                        {r.success
                          ? (p?.apiBase ? p.apiBase + '/v1/models' : r.modelId || '')
                          : (r.errorMessage || '连接失败')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-sm font-mono">{r.success ? r.latencyMs?.toFixed(0) + 'ms' : '-'}</span>
                    <span className="text-xs text-text-tertiary ml-3">
                      {new Date(r.testedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
