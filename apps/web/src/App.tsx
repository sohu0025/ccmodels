import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Usage } from './pages/Usage';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { Settings } from './pages/Settings';
import { Compare } from './pages/Compare';
import { api, setToken } from './api';

type AuthMode = 'login' | 'register';

function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = mode === 'login'
        ? await api.auth.login(email, password)
        : await api.auth.register(email, password, name);

      setToken(res.token);
      localStorage.setItem('auth_token', res.token);
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="card p-8 w-full max-w-md mx-4">
        <h1 className="text-2xl font-bold tracking-tight mb-1">CC Switch</h1>
        <p className="text-sm text-text-secondary mb-6">Web Dashboard — {mode === 'login' ? '登录' : '注册'}</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="昵称"
              className="input w-full"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            required
            className="input w-full"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少6位）"
            required
            minLength={6}
            className="input w-full"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-text-secondary">
          {mode === 'login' ? (
            <>还没有账号？<button onClick={() => setMode('register')} className="text-accent">注册</button></>
          ) : (
            <>已有账号？<button onClick={() => setMode('login')} className="text-accent">登录</button></>
          )}
        </div>
      </div>
    </div>
  );
}

function PageRouter() {
  const path = window.location.pathname;
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

  if (!token) {
    return <LoginPage />;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setLocalToken(null);
  };

  return (
    <Layout onLogout={handleLogout}>
      {path === '/' && <Dashboard />}
      {path === '/usage' && <Usage />}
      {path === '/sessions' && <Sessions />}
      {path.startsWith('/sessions/') && <SessionDetail id={path.split('/')[2]} />}
      {path === '/settings' && <Settings />}
      {path === '/compare' && <Compare />}
    </Layout>
  );
}

export function App() {
  return <PageRouter />;
}
