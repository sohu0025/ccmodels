import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';

export interface SpeedTestRecord {
  id: string;
  providerId: string;
  modelId?: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  testedAt: string;
}

export function recordSpeedTest(providerId: string, latencyMs: number, success: boolean, modelId = '', errorMessage = ''): void {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO speed_tests (id, provider_id, model_id, latency_ms, success, error_message, tested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, providerId, modelId, latencyMs, success ? 1 : 0, errorMessage, now);

  enqueueSync('speed_tests', id, 'INSERT', {
    id,
    providerId,
    modelId,
    latencyMs,
    success,
    testedAt: now,
  });
}

export function getLatestSpeedTests(limit = 50): SpeedTestRecord[] {
  return getDb().prepare(`
    SELECT id, provider_id as providerId, model_id as modelId, latency_ms as latencyMs, success, error_message as errorMessage, tested_at as testedAt
    FROM speed_tests ORDER BY tested_at DESC LIMIT ?
  `).all(limit) as SpeedTestRecord[];
}

export function getProviderAvgLatency(providerId: string, days = 7): number | null {
  const row = getDb().prepare(`
    SELECT AVG(latency_ms) as avg FROM speed_tests
    WHERE provider_id = ? AND success = 1 AND tested_at >= datetime('now', ?)
  `).get(providerId, `-${days} days`) as any;
  return row.avg ?? null;
}

export function getProviderSuccessRate(providerId: string, days = 7): number {
  const row = getDb().prepare(`
    SELECT
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
      COUNT(*) as total
    FROM speed_tests
    WHERE provider_id = ? AND tested_at >= datetime('now', ?)
  `).get(providerId, `-${days} days`) as any;
  return row.total > 0 ? row.successes / row.total : 0;
}
