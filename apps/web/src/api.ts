const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  auth: { token: (userId: string) => request('/api/auth/token', { method: 'POST', body: JSON.stringify({ userId }) }) },
  sync: { push: (items: any[]) => request('/api/sync/push', { method: 'POST', body: JSON.stringify(items) }) },
  usage: { stats: () => request('/api/usage/stats'), daily: (from?: string, to?: string) => request(`/api/usage/daily?from=${from || ''}&to=${to || ''}`) },
  sessions: { list: () => request('/api/sessions'), get: (id: string) => request(`/api/sessions/${id}`) },
  compare: { list: () => request('/api/compare'), create: (data: any) => request('/api/compare', { method: 'POST', body: JSON.stringify(data) }) },
  providers: { list: () => request('/api/providers') },
};
