import { useState, useEffect, useCallback } from 'react';

const api = (window as any).electronAPI;

export function useSpeedTests() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await api.getLatestSpeedTests(50);
    setResults(r);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { results, loading, refresh };
}
