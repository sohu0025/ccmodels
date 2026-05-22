import { useState, useEffect, useCallback } from 'react';
import type { CompareTest } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useCompare() {
  const [tests, setTests] = useState<CompareTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setTests(await api.listCompareTests());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (prompt: string, providerIds: string[], modelIds: string[]) => {
    try {
      setError(null);
      const testId = await api.runCompareTest(prompt, providerIds, modelIds);
      refresh();
      return testId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { tests, loading, error, refresh, create };
}
