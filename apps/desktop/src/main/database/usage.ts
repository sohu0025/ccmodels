import { getDb } from './index';
import type { UsageStats, DailyUsage, ProviderUsageSummary, ModelUsageSummary } from '@ccswitch/shared';

export function getUsageStats(filter: { dateFrom?: string; dateTo?: string }): UsageStats {
  const db = getDb();
  const params: any[] = [];
  let where = '';
  if (filter.dateFrom) { where += ' AND timestamp >= ?'; params.push(filter.dateFrom); }
  if (filter.dateTo) { where += ' AND timestamp <= ?'; params.push(filter.dateTo); }

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(prompt_tokens + completion_tokens), 0) as total_tokens,
      COALESCE(SUM(cost), 0) as total_cost,
      COUNT(*) as total_requests,
      COALESCE(SUM(cache_hit_tokens), 0) as total_cache,
      COALESCE(SUM(prompt_tokens + completion_tokens + cache_hit_tokens), 0) as total_all_tokens
    FROM usage_records WHERE 1=1 ${where}
  `).get(...params) as any;

  return {
    totalTokens: row.total_tokens,
    totalCost: row.total_cost,
    totalRequests: row.total_requests,
    cacheHitRate: row.total_all_tokens > 0 ? row.total_cache / row.total_all_tokens : 0,
    periodStart: filter.dateFrom ?? '',
    periodEnd: filter.dateTo ?? '',
  };
}

export function getDailyUsage(dateFrom: string, dateTo: string): DailyUsage[] {
  return getDb().prepare(`
    SELECT
      date(timestamp) as date,
      COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as completion_tokens,
      COALESCE(SUM(cache_hit_tokens), 0) as cache_hit_tokens,
      COALESCE(SUM(cost), 0) as cost,
      COUNT(*) as requests
    FROM usage_records
    WHERE date(timestamp) >= ? AND date(timestamp) <= ?
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all(dateFrom, dateTo) as DailyUsage[];
}

export function getProviderUsage(dateFrom: string, dateTo: string): ProviderUsageSummary[] {
  return getDb().prepare(`
    SELECT
      u.provider_id as providerId,
      COALESCE(p.name, 'Unknown') as providerName,
      COALESCE(SUM(u.prompt_tokens + u.completion_tokens), 0) as totalTokens,
      COALESCE(SUM(u.cost), 0) as totalCost,
      COUNT(*) as requestCount
    FROM usage_records u
    LEFT JOIN providers p ON p.id = u.provider_id
    WHERE date(u.timestamp) >= ? AND date(u.timestamp) <= ?
    GROUP BY u.provider_id
    ORDER BY totalCost DESC
  `).all(dateFrom, dateTo) as ProviderUsageSummary[];
}

export function getModelUsage(dateFrom: string, dateTo: string): ModelUsageSummary[] {
  return getDb().prepare(`
    SELECT
      u.model_id as modelId,
      COALESCE(p.name, 'Unknown') as providerName,
      COALESCE(SUM(u.prompt_tokens + u.completion_tokens), 0) as totalTokens,
      COALESCE(SUM(u.cost), 0) as totalCost,
      COUNT(*) as requestCount
    FROM usage_records u
    LEFT JOIN providers p ON p.id = u.provider_id
    WHERE date(u.timestamp) >= ? AND date(u.timestamp) <= ?
    GROUP BY u.model_id
    ORDER BY totalCost DESC
  `).all(dateFrom, dateTo) as ModelUsageSummary[];
}

export function getMonthlyCost(year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(cost), 0) as total
    FROM usage_records WHERE timestamp LIKE ?
  `).get(`${prefix}%`) as any;
  return row.total;
}
