import { getDb } from './index';
import type { AppSettings, Theme, Locale } from '@ccmodels/shared';
import { DEFAULT_SERVER_URL } from '@ccmodels/shared';

export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  const serverUrl = map.syncServerUrl || DEFAULT_SERVER_URL;

  return {
    theme: (map.theme ?? 'system') as Theme,
    locale: (map.locale ?? 'zh-CN') as Locale,
    autoStart: map.autoStart === 'true',
    lightweightMode: map.lightweightMode === 'true',
    proxyPort: parseInt(map.proxyPort ?? '15721', 10),
    autoConfigCli: map.autoConfigCli !== 'false',
    serverUrl,
    syncEnabled: map.syncEnabled === 'true',
    syncInterval: parseInt(map.syncInterval ?? '60', 10),
    syncServerUrl: serverUrl,
    syncAuthToken: map.syncAuthToken ?? '',
    monthlyBudgetLimit: parseFloat(map.monthlyBudgetLimit ?? '50'),
    budgetNotifyThreshold: parseInt(map.budgetNotifyThreshold ?? '80', 10),
    speedTestInterval: parseInt(map.speedTestInterval ?? '30', 10),
  };
}

export function updateSettings(data: Partial<AppSettings>): AppSettings {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(data)) {
    // Map serverUrl → syncServerUrl for DB storage (they share the same DB key)
    const dbKey = key === 'serverUrl' ? 'syncServerUrl' : key;
    stmt.run(dbKey, String(value));
  }
  return getSettings();
}
