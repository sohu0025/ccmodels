import { useState } from 'react';
import type { Provider, UsageStats } from '@ccswitch/shared';

const API_BASE = 'http://localhost:3000';

export function App() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const login = async () => {
    // Simple token auth — in production, full login flow
    const res = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user' }),
    });
    const { token: t } = await res.json();
    setToken(t);
  };

  const sync = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify([{ tableName: 'usage_records', recordId: '1', action: 'INSERT' }]),
    });
    setData(await res.json());
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-4">CC Switch — Web Dashboard</h1>
      {!token ? (
        <button onClick={login} className="px-4 py-2 rounded bg-blue-600 text-white">Connect</button>
      ) : (
        <div>
          <p className="text-green-600 mb-4">Connected</p>
          <button onClick={sync} className="px-4 py-2 rounded bg-blue-600 text-white mb-4">Test Sync</button>
          {data && <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
