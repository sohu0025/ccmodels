import { useSpeedTests } from '../hooks/useSpeedTests';

export function SpeedTest() {
  const { results, loading, refresh } = useSpeedTests();

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  const successCount = results.filter((r: any) => r.success).length;
  const successRate = results.length > 0 ? (successCount / results.length) * 100 : 0;
  const avgLatency =
    successCount > 0
      ? results.filter((r: any) => r.success).reduce((a: number, r: any) => a + r.latencyMs, 0) / successCount
      : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Speed Test</h2>
          <p className="text-sm text-text-secondary mt-1">API provider latency and availability monitoring</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">Tests Run</p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">Avg Latency</p>
          <p className="text-2xl font-bold">{avgLatency.toFixed(0)} ms</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">Availability</p>
          <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">History</h3>
        </div>
        <div className="divide-y divide-border">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">
              No speed test data yet. Set a speed test interval in Settings to start automatic testing.
            </p>
          ) : (
            results.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${r.success ? 'bg-success' : 'bg-danger'}`}
                  />
                  <span className="text-sm">{r.providerId?.slice(0, 8)}...</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono">{r.latencyMs?.toFixed(0)} ms</span>
                  <span className="text-xs text-text-secondary ml-3">
                    {new Date(r.testedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
