const API_BASE = import.meta.env.VITE_API_URL || '';

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

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw { status: res.status, response: data, message: data?.message ?? `API error: ${res.status}` };
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) => request('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
    register: (email: string, password: string, name: string) => request('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, name }),
    }),
    token: (userId: string) => request('/api/auth/token', {
      method: 'POST', body: JSON.stringify({ userId }),
    }),
  },
  sync: { push: (items: any[]) => request('/api/sync/push', { method: 'POST', body: JSON.stringify(items) }) },
  usage: { stats: () => request('/api/usage/stats'), daily: (from?: string, to?: string) => request(`/api/usage/daily?from=${from || ''}&to=${to || ''}`) },
  sessions: { list: (page = 1, pageSize = 20, search?: string) => request(`/api/sessions?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`), get: (id: string) => request(`/api/sessions/${id}`) },
  compare: { list: () => request('/api/compare'), create: (data: any) => request('/api/compare', { method: 'POST', body: JSON.stringify(data) }) },
  providers: { list: () => request('/api/providers') },
  systemProviders: { list: () => request('/api/system-providers') },
  admin: {
    systemProviders: {
      list: () => request('/api/admin/system-providers'),
      get: (id: string) => request(`/api/admin/system-providers/${id}`),
      create: (data: any) => request('/api/admin/system-providers', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) => request(`/api/admin/system-providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      remove: (id: string) => request(`/api/admin/system-providers/${id}`, { method: 'DELETE' }),
    },
    settings: {
      list: () => request('/api/admin/settings'),
      get: (key: string) => request(`/api/admin/settings/${key}`),
      update: (key: string, value: string) => request(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ key, value }) }),
    },
    buildInstaller: () => request('/api/admin/build-installer', { method: 'POST' }),
    buildInstallerStatus: () => request('/api/admin/build-installer/status'),
  },
};
