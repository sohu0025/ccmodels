import { useSpeedTests } from '../hooks/useSpeedTests';

export function SpeedTest() {
  const { results, loading, refresh } = useSpeedTests();

  if (loading) return <div className="text-text-secondary">Loading...</div>;

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
          <h2 className="text-2xl font-bold tracking-tight">供应商测速</h2>
          <p className="text-sm text-text-secondary mt-1">API 延迟和可用性实时监控</p>
        </div>
        <button onClick={refresh} className="btn-primary">刷新</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        <div className="stat-card">
          <p className="stat-label">测试次数</p>
          <p className="stat-value">{results.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">平均延迟</p>
          <p className="stat-value">{avgLatency.toFixed(0)}ms</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">可用率</p>
          <p className="stat-value">{successRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold">测速记录</h3>
        </div>
        {results.length === 0 ? (
          <div className="p-10 text-center text-text-secondary text-sm">
            暂无测速数据，前往设置页配置自动测速间隔
          </div>
        ) : (
          <div className="divide-y divide-border">
            {results.map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`indicator ${r.success ? 'indicator-success' : 'indicator-danger'}`} />
                  <span className="text-sm">{r.providerId?.slice(0, 8)}...</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono">{r.latencyMs?.toFixed(0)}ms</span>
                  <span className="text-xs text-text-tertiary ml-3">
                    {new Date(r.testedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
