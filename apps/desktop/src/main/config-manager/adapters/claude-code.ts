import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter } from './index';

const HOME = os.homedir();
const configPaths = [path.join(HOME, '.claude', 'settings.json')];
if (process.env.APPDATA) {
  configPaths.push(path.join(process.env.APPDATA, 'Claude', 'settings.json'));
}

export const claudeCodeAdapter: CliAdapter = {
  name: 'claude-code',
  configPaths,

  readConfig(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {};
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  },

  applyProxy(config: Record<string, unknown>): Record<string, unknown> {
    return {
      ...config,
      provider: {
        ...((config.provider as Record<string, unknown>) ?? {}),
        baseUrl: 'http://127.0.0.1:15721',
      },
      apiKeyHelper: 'ccswitch',
    };
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const { apiKeyHelper, ...rest } = config as Record<string, unknown>;
    if (rest.provider && (rest.provider as Record<string, unknown>).baseUrl === 'http://127.0.0.1:15721') {
      const { baseUrl, ...restProvider } = rest.provider as Record<string, unknown>;
      rest.provider = restProvider;
    }
    return rest;
  },
};
