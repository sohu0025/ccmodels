import { useState, useEffect, useCallback } from 'react';
import type { Provider, ProviderFormData } from '@ccmodels/shared';

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
    const result = await api.createProvider(data);
    refresh();
    return result;
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

  // ── Tool→provider mapping (old 1:1, for backward compat) ──
  const [toolProviders, setToolProvidersState] = useState<Record<string, string>>({});

  const refreshToolProviders = useCallback(async () => {
    const mapping = await api.getToolProviders();
    setToolProvidersState(mapping);
  }, []);

  useEffect(() => { refreshToolProviders(); }, [refreshToolProviders]);

  // Version counter bumped on every external change (tray, etc.) — lets components
  // with local state (e.g. Providers.tsx) re-fetch by adding it to deps.
  const [externalVersion, setExternalVersion] = useState(0);

  // Listen for push notification from tray / main process
  useEffect(() => {
    const cleanup = api.onToolActiveChanged?.(() => {
      refresh();
      refreshToolProviders();
      setExternalVersion(v => v + 1);
    });
    return () => cleanup?.();
  }, [refresh, refreshToolProviders]);

  const updateToolProviders = async (mapping: Record<string, string>) => {
    await api.setToolProviders(mapping);
    refreshToolProviders();
  };

  // ── Multi-provider per tool ──
  const addProviderToTool = async (toolName: string, providerId: string) => {
    await api.addProviderToTool(toolName, providerId);
    refreshToolProviders();
  };

  const removeProviderFromTool = async (toolName: string, providerId: string) => {
    await api.removeProviderFromTool(toolName, providerId);
    refreshToolProviders();
  };

  const setToolActiveProvider = async (toolName: string, providerId: string) => {
    await api.setToolActiveProvider(toolName, providerId);
  };

  return {
    providers, loading, refresh,
    create, update, remove, setActive,
    toolProviders, updateToolProviders,
    addProviderToTool, removeProviderFromTool, setToolActiveProvider,
    externalVersion,
  };
}
