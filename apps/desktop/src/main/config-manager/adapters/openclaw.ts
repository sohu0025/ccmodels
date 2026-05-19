import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter } from './index';

const HOME = os.homedir();

export const openclawAdapter: CliAdapter = {
  name: 'openclaw',
  configPaths: [path.join(HOME, '.openclaw', 'config.yaml')],

  readConfig(filePath: string): Record<string, unknown> {
    // YAML is complex; for MVP, treat as JSON-like key-value
    if (!fs.existsSync(filePath)) return {};
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result: Record<string, unknown> = {};
      let currentKey = '';
      for (const line of content.split('\n')) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          currentKey = match[1];
          result[currentKey] = match[2].trim().replace(/^"|"$/g, '');
        } else {
          const nestedMatch = line.match(/^\s+(\w+):\s*(.+)$/);
          if (nestedMatch && currentKey) {
            const nested = (result[currentKey] as Record<string, unknown>) ?? {};
            nested[nestedMatch[1]] = nestedMatch[2].trim().replace(/^"|"$/g, '');
            result[currentKey] = nested;
          }
        }
      }
      return result;
    } catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let output = '';
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null) {
        output += `${key}:\n`;
        for (const [nk, nv] of Object.entries(value as Record<string, unknown>)) {
          output += `  ${nk}: "${nv}"\n`;
        }
      } else {
        output += `${key}: "${value}"\n`;
      }
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
