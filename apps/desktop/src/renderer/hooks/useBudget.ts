import { useState, useEffect, useCallback } from 'react';

const api = (window as any).electronAPI;

export function useBudget() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await api.getBudgetStatus();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, refresh };
}
