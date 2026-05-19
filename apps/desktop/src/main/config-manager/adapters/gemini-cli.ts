import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter } from './index';

const HOME = os.homedir();

export const geminiCliAdapter: CliAdapter = {
  name: 'gemini-cli',
  configPaths: [path.join(HOME, '.gemini', 'config.json')],

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
    return { ...config, apiEndpoint: 'http://127.0.0.1:15721' };
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    if ((config as Record<string, unknown>).apiEndpoint === 'http://127.0.0.1:15721') {
      const { apiEndpoint, ...rest } = config as Record<string, unknown>;
      return rest;
    }
    return config;
  },
};
