import { useEffect, useState } from 'react';
import { api } from '../api';
import { StatCard } from '../components/StatCard';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.usage.stats().then(setStats).catch(() => {}); }, []);

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Requests" value={stats?.totalRequests ?? '-'} />
        <StatCard title="Total Tokens" value={stats?.totalTokens?.toLocaleString() ?? '-'} />
        <StatCard title="Total Cost" value={stats ? `$${stats.totalCost.toFixed(4)}` : '-'} />
        <StatCard title="Active Providers" value={stats?.activeProviders ?? '-'} />
      </div>
      {!stats && <p className="text-gray-500 text-sm">Connect to backend to view stats.</p>}
    </div>
  );
}
