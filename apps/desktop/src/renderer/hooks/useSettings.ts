import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@ccswitch/shared';

const api = (window as any).electronAPI;

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async () => {
    const s = await api.getSettings();
    setSettings(s);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (data: Partial<AppSettings>) => {
    const s = await api.updateSettings(data);
    setSettings(s);
  };

  return { settings, refresh, update };
}
