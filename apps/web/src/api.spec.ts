import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, setToken, getToken } from './api';

describe('API Client', () => {
  beforeEach(() => {
    setToken(null);
    vi.restoreAllMocks();
  });

  describe('setToken / getToken', () => {
    it('should store and retrieve token', () => {
      setToken('my-token');
      expect(getToken()).toBe('my-token');
    });

    it('should clear token when set to null', () => {
      setToken('my-token');
      setToken(null);
      expect(getToken()).toBeNull();
    });
  });

  describe('auth.login', () => {
    it('should POST credentials to /api/auth/login', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt-123', user: { id: '1', email: 'test@test.com' } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.auth.login('test@test.com', 'password');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
        })
      );
    });
  });

  describe('auth.register', () => {
    it('should POST registration data to /api/auth/register', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'new-user', email: 'new@test.com' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.auth.register('new@test.com', 'password', 'New User');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@test.com', password: 'password', name: 'New User' }),
        })
      );
    });
  });

  describe('auth.token', () => {
    it('should POST userId to /api/auth/token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'generated-jwt' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.auth.token('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'user-123' }),
        })
      );
    });
  });

  describe('usage.stats', () => {
    it('should GET /api/usage/stats', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ totalCost: 1.23, totalTokens: 5000 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.usage.stats();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/usage/stats',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });
  });

  describe('usage.daily', () => {
    it('should GET /api/usage/daily with date range', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ days: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.usage.daily('2026-05-01', '2026-05-20');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/usage/daily?from=2026-05-01&to=2026-05-20',
        expect.any(Object)
      );
    });
  });

  describe('sessions.list', () => {
    it('should GET /api/sessions with pagination', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.sessions.list(2, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions?page=2&pageSize=10',
        expect.any(Object)
      );
    });

    it('should include search parameter when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await api.sessions.list(1, 20, 'test query');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions?page=1&pageSize=20&search=test query',
        expect.any(Object)
      );
    });
  });

  describe('Authorization header', () => {
    it('should include Bearer token when set', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      setToken('my-jwt-token');
      await api.providers.list();

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    it('should not include Authorization header when no token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      setToken(null);
      await api.providers.list();

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Authorization']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw on 401 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(api.providers.list()).rejects.toEqual(
        expect.objectContaining({ status: 401, message: 'Unauthorized' })
      );
    });

    it('should throw on 500 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(api.usage.stats()).rejects.toEqual(
        expect.objectContaining({ status: 500 })
      );
    });
  });
});
