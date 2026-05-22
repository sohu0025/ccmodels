import { useState, useEffect, useCallback } from 'react';
import type { Recommendation } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setRecommendations(await api.listRecommendations());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const generate = async () => {
    setRecommendations(await api.generateRecommendations());
  };

  return { recommendations, loading, refresh, generate };
}
