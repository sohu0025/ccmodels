import { useState } from 'react';

const DEMO_DAILY = [
  { date: '2026-05-14', requests: 1823, tokens: 542000, cost: 0.612 },
  { date: '2026-05-15', requests: 2104, tokens: 618000, cost: 0.743 },
  { date: '2026-05-16', requests: 1956, tokens: 589000, cost: 0.687 },
  { date: '2026-05-17', requests: 2234, tokens: 671000, cost: 0.821 },
  { date: '2026-05-18', requests: 2410, tokens: 723000, cost: 0.894 },
  { date: '2026-05-19', requests: 1680, tokens: 499000, cost: 0.312 },
  { date: '2026-05-20', requests: 640, tokens: 200000, cost: 0.214 },
];

const DEMO_BY_PROVIDER = [
  { providerId: 'OpenAI', requests: 4823, totalTokens: 1420000, totalCost: 1.823 },
  { providerId: 'Anthropic', requests: 3210, totalTokens: 980000, totalCost: 1.456 },
  { providerId: 'Google', requests: 1890, totalTokens: 520000, totalCost: 0.521 },
];

export function Usage() {
  const [daily, setDaily] = useState(DEMO_DAILY);
  const [byProvider, setByProvider] = useState<any[]>(DEMO_BY_PROVIDER);

  const totals = daily.reduce((acc, d) => ({
    requests: acc.requests + d.requests,
    tokens: acc.tokens + d.tokens,
    cost: acc.cost + d.cost,
  }), { requests: 0, tokens: 0, cost: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">用量成本</h1>
        <p className="section-subtitle">API 调用量与费用统计</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-accent">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">总请求</div>
          <div className="stat-value text-2xl text-text-primary">{totals.requests.toLocaleString()}</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-accent">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">总 Token</div>
          <div className="stat-value text-2xl text-text-primary">{totals.tokens.toLocaleString()}</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-success">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">总费用</div>
          <div className="stat-value text-2xl text-text-primary">${totals.cost.toFixed(3)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4">每日用量</h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-medium">日期</th>
                  <th className="text-right py-3 font-medium">请求</th>
                  <th className="text-right py-3 font-medium">Tokens</th>
                  <th className="text-right py-3 font-medium">费用</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date} className="border-b border-border/30 hover:bg-bg-secondary/30 transition-colors">
                    <td className="py-3 font-medium text-text-primary">{d.date}</td>
                    <td className="py-3 text-right text-text-secondary">{d.requests.toLocaleString()}</td>
                    <td className="py-3 text-right text-text-secondary">{d.tokens.toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-text-primary">${d.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4">按供应商</h3>
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-medium">供应商</th>
                  <th className="text-right py-3 font-medium">请求</th>
                  <th className="text-right py-3 font-medium">Tokens</th>
                  <th className="text-right py-3 font-medium">费用</th>
                </tr>
              </thead>
              <tbody>
                {byProvider.map((p, i) => (
                  <tr key={p.providerId || i} className="border-b border-border/30 hover:bg-bg-secondary/30 transition-colors">
                    <td className="py-3 font-medium text-text-primary">{p.providerId}</td>
                    <td className="py-3 text-right text-text-secondary">{p.requests?.toLocaleString() || '-'}</td>
                    <td className="py-3 text-right text-text-secondary">{p.totalTokens?.toLocaleString() || '-'}</td>
                    <td className="py-3 text-right font-medium text-text-primary">${(p.totalCost || 0).toFixed(4)}</td>
                  </tr>
                ))}
                {byProvider.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-tertiary text-sm">暂无供应商数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
