import { useEffect, useState } from 'react';
import { api } from '../api';

const DEMO_STATS = {
  totalRequests: 12847,
  totalTokens: 3842156,
  totalCost: 4.2831,
  activeProviders: 3,
  avgLatency: 234,
  cacheHitRate: 0.42,
  sessionCount: 56,
  speedTestSuccess: 0.97,
};

const DEMO_PROVIDERS = [
  { id: '1', name: 'OpenAI', apiBase: 'https://api.openai.com', isActive: true },
  { id: '2', name: 'Anthropic', apiBase: 'https://api.anthropic.com', isActive: false },
  { id: '3', name: 'Google', apiBase: 'https://generativelanguage.googleapis.com', isActive: false },
];

const DEMO_DAILY = [
  { date: '2026-05-14', requests: 1823, tokens: 542000, cost: 0.612 },
  { date: '2026-05-15', requests: 2104, tokens: 618000, cost: 0.743 },
  { date: '2026-05-16', requests: 1956, tokens: 589000, cost: 0.687 },
  { date: '2026-05-17', requests: 2234, tokens: 671000, cost: 0.821 },
  { date: '2026-05-18', requests: 2410, tokens: 723000, cost: 0.894 },
  { date: '2026-05-19', requests: 1680, tokens: 499000, cost: 0.312 },
  { date: '2026-05-20', requests: 640, tokens: 200000, cost: 0.214 },
];

const DEMO_SESSIONS = [
  { id: 's1', title: 'React component refactor', provider: 'OpenAI', model: 'gpt-4o', cost: 0.12, tokens: 34000, startedAt: '2026-05-20 09:30', messages: 42 },
  { id: 's2', title: 'Database migration script', provider: 'Anthropic', model: 'claude-sonnet-4-6', cost: 0.34, tokens: 89000, startedAt: '2026-05-20 08:15', messages: 67 },
  { id: 's3', title: 'API endpoint testing', provider: 'OpenAI', model: 'gpt-4o-mini', cost: 0.05, tokens: 12000, startedAt: '2026-05-19 16:45', messages: 23 },
];

const DEMO_COMPARES = [
  { id: 'c1', prompt: 'Explain the difference between REST and GraphQL', models: ['gpt-4o', 'claude-sonnet-4-6', 'gemini-pro'], status: 'completed', createdAt: '2026-05-19 14:00' },
  { id: 'c2', prompt: 'Write a binary search tree in TypeScript', models: ['gpt-4o', 'claude-opus-4-7'], status: 'pending', createdAt: '2026-05-20 10:30' },
];

function BarChart({ data }: { data: typeof DEMO_DAILY }) {
  const maxCost = Math.max(...data.map(d => d.cost));
  return (
    <div className="flex items-end gap-2 h-32 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          <div className="w-full rounded-t-md transition-all cursor-pointer"
            style={{
              height: `${(d.cost / maxCost) * 100}%`,
              minHeight: '4px',
              background: 'linear-gradient(180deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
              opacity: 0.8,
            }}
            title={`${d.date}: $${d.cost.toFixed(3)}`}
          />
          <span className="text-[10px] text-text-tertiary mt-1">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<any>(DEMO_STATS);
  const [providers, setProviders] = useState(DEMO_PROVIDERS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">仪表盘</h1>
        <p className="section-subtitle">全局用量与服务状态概览</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-accent">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">Total Requests</div>
          <div className="stat-value text-2xl text-text-primary">{stats?.totalRequests?.toLocaleString() ?? '—'}</div>
          <div className="stat-desc text-text-tertiary text-xs">累计请求数</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-accent">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">Total Tokens</div>
          <div className="stat-value text-2xl text-text-primary">{stats?.totalTokens?.toLocaleString() ?? '—'}</div>
          <div className="stat-desc text-text-tertiary text-xs">Token 总量</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-success">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">Total Cost</div>
          <div className="stat-value text-2xl text-text-primary">${stats?.totalCost?.toFixed(4) ?? '—'}</div>
          <div className="stat-desc text-text-tertiary text-xs">累计费用</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-figure text-warning">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div className="stat-title text-text-secondary text-xs font-medium">Active Providers</div>
          <div className="stat-value text-2xl text-text-primary">{stats?.activeProviders ?? '—'}</div>
          <div className="stat-desc text-text-tertiary text-xs">活跃供应商数</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            7 日用量趋势
          </h3>
          <BarChart data={DEMO_DAILY} />
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            已配置供应商
          </h3>
          <div className="divide-y divide-border/60">
            {providers.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-success shadow-sm shadow-success/50' : 'bg-border'}`} />
                  <div>
                    <span className="text-sm font-medium text-text-primary">{p.name}</span>
                    <span className="text-xs text-text-tertiary ml-2">{p.apiBase}</span>
                  </div>
                </div>
                {p.isActive && (
                  <span className="badge badge-sm bg-success/10 text-success border-success/20 font-medium">当前</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Usage() {
  const [daily, setDaily] = useState(DEMO_DAILY);

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
          <div className="stat-title text-text-secondary text-xs font-medium">7 日请求</div>
          <div className="stat-value text-2xl text-text-primary">{totals.requests.toLocaleString()}</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-title text-text-secondary text-xs font-medium">7 日 Token</div>
          <div className="stat-value text-2xl text-text-primary">{totals.tokens.toLocaleString()}</div>
        </div>
        <div className="stat bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm">
          <div className="stat-title text-text-secondary text-xs font-medium">7 日费用</div>
          <div className="stat-value text-2xl text-text-primary">${totals.cost.toFixed(3)}</div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-text-primary mb-4">每日用量</h3>
        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-text-secondary text-xs uppercase tracking-wider">
                <th className="text-left py-3 font-medium">日期</th>
                <th className="text-right py-3 font-medium">请求数</th>
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
    </div>
  );
}

export function Sessions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">会话历史</h1>
        <p className="section-subtitle">查看最近的对话记录</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm divide-y divide-border/60">
        {DEMO_SESSIONS.map((s) => (
          <a key={s.id} href={`#/sessions/${s.id}`} className="flex items-center justify-between p-4 hover:bg-bg-secondary/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{s.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">{s.provider} · {s.model} · {s.messages} 条消息</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">${s.cost.toFixed(2)}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{s.startedAt}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const session = DEMO_SESSIONS.find(s => s.id === id) || DEMO_SESSIONS[0];

  const messages = [
    { role: 'user', content: 'Help me refactor this component to use React hooks', time: '09:30' },
    { role: 'assistant', content: 'Sure! I can help you convert this class component to a functional component using hooks. Here\'s the refactored version:\n\n```tsx\nconst MyComponent = () => {\n  const [state, setState] = useState(initialState);\n  // ...\n};\n```', time: '09:31' },
    { role: 'user', content: 'What about the lifecycle methods?', time: '09:32' },
    { role: 'assistant', content: 'Great question! Here\'s the mapping:\n- `componentDidMount` → `useEffect(() => {...}, [])`\n- `componentDidUpdate` → `useEffect(() => {...}, [deps])`\n- `componentWillUnmount` → `useEffect(() => { return cleanup }, [])`', time: '09:33' },
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <a href="#/sessions" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        返回会话列表
      </a>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{session.title}</h3>
            <p className="text-xs text-text-secondary mt-1">{session.provider} · {session.model}</p>
          </div>
          <div className="text-right text-sm">
            <span className="badge bg-accent/10 text-accent border-accent/20 font-medium">{session.messages} 条消息</span>
            <p className="text-text-secondary mt-1">${session.cost.toFixed(2)}</p>
          </div>
        </div>
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-bg-tertiary text-text-primary rounded-bl-md'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-2 ${m.role === 'user' ? 'text-white/60' : 'text-text-tertiary'}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Compare() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">模型对比</h1>
        <p className="section-subtitle">多模型回答对比测试</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl shadow-sm divide-y divide-border/60">
        {DEMO_COMPARES.map((c) => (
          <div key={c.id} className="p-4 hover:bg-bg-secondary/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'completed' ? 'bg-success' : 'bg-warning'}`} />
                <p className="text-sm font-medium text-text-primary truncate">{c.prompt}</p>
              </div>
              <span className={`badge badge-sm shrink-0 ml-3 ${
                c.status === 'completed'
                  ? 'bg-success/10 text-success border-success/20'
                  : 'bg-warning/10 text-warning border-warning/20'
              }`}>
                {c.status === 'completed' ? '已完成' : '进行中'}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1.5 ml-5">{c.models.join(', ')} · {c.createdAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
