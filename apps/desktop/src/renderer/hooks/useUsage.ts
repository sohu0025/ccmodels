import { useState, useEffect, useCallback } from 'react';
import type { UsageStats, DailyUsage, ProviderUsageSummary, ModelUsageSummary } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useUsage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [providerUsage, setProviderUsage] = useState<ProviderUsageSummary[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    const end = dateTo ?? new Date().toISOString().split('T')[0];
    const start = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [s, d, p, m] = await Promise.all([
      api.getUsageStats({ dateFrom: start, dateTo: end }),
      api.getDailyUsage(start, end),
      api.getUsageByProvider(start, end),
      api.getUsageByModel(start, end),
    ]);
    setStats(s);
    setDailyUsage(d);
    setProviderUsage(p);
    setModelUsage(m);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, dailyUsage, providerUsage, modelUsage, loading, refresh };
}
