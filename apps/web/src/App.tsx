import { useState, useEffect } from 'react';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProviders } from './pages/AdminProviders';
import { AdminAds } from './pages/AdminAds';
import { AdminSettings } from './pages/AdminSettings';
import { api, setToken } from './api';

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setToken(res.token);
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('auth_user', JSON.stringify(res.user));
      onLogin();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="card bg-white/80 backdrop-blur-xl border border-border/60 shadow-lg p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">CC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">CC Models</h1>
          <p className="text-sm text-text-secondary mt-1">管理后台</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">账号</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
              required
              className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={6}
              className="input w-full bg-white border-border/60 focus:border-accent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <button type="submit" disabled={loading} className="btn bg-accent text-white w-full h-10 rounded-lg font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-50">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function App() {
  const [token, setLocalToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
      setLocalToken(stored);
    }
    setChecking(false);
  }, []);

  if (checking) return null;
  if (!token) return <LoginPage onLogin={() => window.location.reload()} />;

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/';
  };

  const path = window.location.pathname;
  return (
    <AdminLayout onLogout={handleLogout}>
      {(path === '/' || path === '/admin') && <AdminDashboard />}
      {path === '/admin/providers' && <AdminProviders />}
      {path === '/admin/ads' && <AdminAds />}
      {path === '/admin/settings' && <AdminSettings />}
    </AdminLayout>
  );
}
