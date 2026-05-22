import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordFailure as _recordFailure,
  recordSuccess as _recordSuccess,
  isCircuitOpen as _isCircuitOpen,
  getCircuitStatus as _getCircuitStatus,
  getAllCircuitStatuses as _getAllCircuitStatuses,
} from './failover';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Reset the internal breakers map by calling recordSuccess on all known providers
    // Since the module uses a private Map, we test isolation via the public API
    // For proper reset, we use vi.resetModules to get a fresh module
    vi.resetModules();
  });

  async function getFreshModule() {
    return await import('./failover');
  }

  describe('recordFailure', () => {
    it('should not open circuit after 1 failure', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(false);
    });

    it('should not open circuit after 2 failures', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(false);
    });

    it('should open circuit after 3 consecutive failures (threshold)', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset circuit breaker on success', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(true);

      mod.recordSuccess('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(false);
    });

    it('should be safe to call on provider with no breaker state', async () => {
      const mod = await getFreshModule();
      expect(() => mod.recordSuccess('unknown-provider')).not.toThrow();
    });
  });

  describe('isCircuitOpen', () => {
    it('should return false for unknown provider', async () => {
      const mod = await getFreshModule();
      expect(mod.isCircuitOpen('nonexistent')).toBe(false);
    });

    it('should return false after cooldown expires', async () => {
      const mod = await getFreshModule();
      const COOLDOWN_MS = 30000;

      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      expect(mod.isCircuitOpen('provider-1')).toBe(true);

      // Fast-forward time past cooldown
      vi.useFakeTimers();
      vi.advanceTimersByTime(COOLDOWN_MS + 1000);
      expect(mod.isCircuitOpen('provider-1')).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('getCircuitStatus', () => {
    it('should return default status for unknown provider', async () => {
      const mod = await getFreshModule();
      const status = mod.getCircuitStatus('unknown');
      expect(status).toEqual({ isOpen: false, failures: 0, cooldownRemaining: 0 });
    });

    it('should report failure count and cooldown when circuit is open', async () => {
      const mod = await getFreshModule();

      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');
      mod.recordFailure('provider-1');

      const status = mod.getCircuitStatus('provider-1');
      expect(status.isOpen).toBe(true);
      expect(status.failures).toBe(3);
      expect(status.cooldownRemaining).toBeGreaterThan(0);
      expect(status.cooldownRemaining).toBeLessThanOrEqual(30000);
    });
  });

  describe('getAllCircuitStatuses', () => {
    it('should return statuses for all providers with breaker state', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('p1');
      mod.recordFailure('p2');
      mod.recordFailure('p2');
      mod.recordFailure('p2');

      const statuses = mod.getAllCircuitStatuses();
      expect(Object.keys(statuses)).toContain('p1');
      expect(Object.keys(statuses)).toContain('p2');
      expect(statuses.p2.isOpen).toBe(true);
      expect(statuses.p1.isOpen).toBe(false);
    });

    it('should return empty object when no breakers exist', async () => {
      const mod = await getFreshModule();
      expect(mod.getAllCircuitStatuses()).toEqual({});
    });
  });

  describe('multiple providers', () => {
    it('should isolate breakers between providers', async () => {
      const mod = await getFreshModule();
      mod.recordFailure('provider-a');
      mod.recordFailure('provider-a');
      mod.recordFailure('provider-a');

      expect(mod.isCircuitOpen('provider-a')).toBe(true);
      expect(mod.isCircuitOpen('provider-b')).toBe(false);
    });
  });
});
