import { getDb } from './index';
import type { AppSettings, Theme, Locale } from '@ccswitch/shared';

export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  return {
    theme: (map.theme ?? 'system') as Theme,
    locale: (map.locale ?? 'zh-CN') as Locale,
    autoStart: map.autoStart === 'true',
    lightweightMode: map.lightweightMode === 'true',
    proxyPort: parseInt(map.proxyPort ?? '15721', 10),
    autoConfigCli: map.autoConfigCli !== 'false',
    syncEnabled: map.syncEnabled === 'true',
    syncInterval: parseInt(map.syncInterval ?? '60', 10),
  };
}

export function updateSettings(data: Partial<AppSettings>): AppSettings {
  const stmt = getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(data)) {
    stmt.run(key, String(value));
  }
  return getSettings();
}
