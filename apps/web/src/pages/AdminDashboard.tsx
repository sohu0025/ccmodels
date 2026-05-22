import { useState, useEffect } from 'react';

interface DashboardData {
  totalUsers: number;
  totalUsage: number;
  topUsers: { rank: number; deviceId: string; usageCount: number; lastSeen: string }[];
}

export function AdminDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      const qs = params.toString();
      const res = await fetch(`/api/admin/stats/dashboard${qs ? `?${qs}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(startDate, endDate); }, []);

  const handleSearch = () => load(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">首页</h1>
          <p className="text-sm text-text-secondary mt-1">软件使用数据概览</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">开始</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input bg-white border-border/60 rounded-lg px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">结束</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input bg-white border-border/60 rounded-lg px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <button onClick={handleSearch} className="btn bg-accent text-white px-4 py-1.5 rounded-lg text-sm hover:bg-accent-hover transition-colors">
          查询
        </button>
        <button onClick={() => { setStartDate(''); setEndDate(''); load('', ''); }} className="btn border border-border/60 px-4 py-1.5 rounded-lg text-sm hover:bg-bg-secondary transition-colors">
          全部
        </button>
        {startDate || endDate ? (
          <span className="text-xs text-text-tertiary ml-2">当前为筛选范围数据</span>
        ) : (
          <span className="text-xs text-text-tertiary ml-2">当前为全部数据</span>
        )}
      </div>

      {loading ? (
        <div className="text-text-secondary">加载中...</div>
      ) : !data ? (
        <div className="text-text-secondary">暂无数据</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6">
              <div className="text-sm text-text-secondary mb-1">
                {startDate || endDate ? '新增用户数' : '总用户数（安装量）'}
              </div>
              <div className="text-3xl font-bold text-text-primary">{data.totalUsers}</div>
            </div>
            <div className="card bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6">
              <div className="text-sm text-text-secondary mb-1">
                {startDate || endDate ? '使用次数' : '软件使用总次数'}
              </div>
              <div className="text-3xl font-bold text-text-primary">{data.totalUsage}</div>
            </div>
          </div>

          <div className="card bg-white/80 backdrop-blur-xl border border-border/60 rounded-xl p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">使用次数排行 TOP 5</h2>
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-medium w-16">排名</th>
                  <th className="text-left py-3 font-medium">设备</th>
                  <th className="text-right py-3 font-medium">使用次数</th>
                  <th className="text-right py-3 font-medium">最后使用</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-text-secondary">暂无数据</td></tr>
                ) : (
                  data.topUsers.map((u) => (
                    <tr key={u.rank} className="border-b border-border/30 hover:bg-bg-secondary/30 transition-colors">
                      <td className="py-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          u.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          u.rank === 2 ? 'bg-gray-100 text-gray-600' :
                          u.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-bg-secondary text-text-secondary'
                        }`}>
                          {u.rank}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-text-primary">{u.deviceId}</td>
                      <td className="py-3 text-right font-medium">{u.usageCount}</td>
                      <td className="py-3 text-right text-text-secondary">{new Date(u.lastSeen).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
