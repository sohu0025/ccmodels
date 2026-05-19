import { useState, useEffect, useCallback } from 'react';
import type { CompareTest } from '@ccswitch/shared';

const api = (window as any).electronAPI;

export function useCompare() {
  const [tests, setTests] = useState<CompareTest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTests(await api.listCompareTests());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (prompt: string, models: string[]) => {
    const test = await api.createCompareTest(prompt, models);
    refresh();
    return test;
  };

  return { tests, loading, refresh, create };
}
