import { useState, useEffect, useCallback } from 'react';
import type { Provider, ProviderFormData } from '@ccswitch/shared';

const api = (window as any).electronAPI;

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await api.getProviders();
    setProviders(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: ProviderFormData) => {
    await api.createProvider(data);
    refresh();
  };

  const update = async (id: string, data: Partial<ProviderFormData>) => {
    await api.updateProvider(id, data);
    refresh();
  };

  const remove = async (id: string) => {
    await api.deleteProvider(id);
    refresh();
  };

  const setActive = async (id: string) => {
    await api.setActiveProvider(id);
    refresh();
  };

  return { providers, loading, refresh, create, update, remove, setActive };
}
