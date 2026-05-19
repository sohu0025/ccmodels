import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter } from './index';

const HOME = os.homedir();

export const codexAdapter: CliAdapter = {
  name: 'codex',
  configPaths: [path.join(HOME, '.codex', 'config.toml')],

  readConfig(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {};
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result: Record<string, unknown> = {};
      let section = '';
      for (const line of content.split('\n')) {
        const sectionMatch = line.match(/^\[(\w+)\]/);
        if (sectionMatch) {
          section = sectionMatch[1];
          result[section] = result[section] ?? {};
          continue;
        }
        const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (kvMatch && section) {
          (result[section] as Record<string, unknown>)[kvMatch[1].trim()] = kvMatch[2].trim().replace(/^"|"$/g, '');
        }
      }
      return result;
    } catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let output = '';
    for (const [section, values] of Object.entries(config)) {
      output += `[${section}]\n`;
      for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
        output += `${key} = "${value}"\n`;
      }
      output += '\n';
    }
    fs.writeFileSync(filePath, output, 'utf-8');
  },

  applyProxy(config: Record<string, unknown>): Record<string, unknown> {
    const api = (config.api as Record<string, unknown>) ?? {};
    return { ...config, api: { ...api, base_url: 'http://127.0.0.1:15721' } };
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    if (config.api) {
      const api = config.api as Record<string, unknown>;
      if (api.base_url === 'http://127.0.0.1:15721') {
        const { base_url, ...rest } = api;
        if (Object.keys(rest).length > 0) {
          config.api = rest;
        } else {
          delete config.api;
        }
      }
    }
    return config;
  },
};
