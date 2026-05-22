import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppSettings } from '@ccmodels/shared';

const api = (window as any).electronAPI;

type SettingsContextType = {
  settings: AppSettings | null;
  refresh: () => Promise<void>;
  update: (data: Partial<AppSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>(null!);

export function SettingsProvider({ children }: { children: ReactNode }) {
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

  return (
    <SettingsContext.Provider value={{ settings, refresh, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  return useContext(SettingsContext);
}
