import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Usage } from './pages/Usage';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { Settings } from './pages/Settings';
import { api, setToken } from './api';

function PageRouter() {
  const path = window.location.pathname;
  const [token, setLocalToken] = useState<string | null>(null);

  const login = async () => {
    const res = await api.auth.token('demo-user');
    setToken(res.token);
    setLocalToken(res.token);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">CC Switch — Web Dashboard</h1>
          <button onClick={login} className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Connect to Backend</button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {path === '/' && <Dashboard />}
      {path === '/usage' && <Usage />}
      {path === '/sessions' && <Sessions />}
      {path.startsWith('/sessions/') && <SessionDetail id={path.split('/')[2]} />}
      {path === '/settings' && <Settings />}
    </Layout>
  );
}

export function App() {
  return <PageRouter />;
}
