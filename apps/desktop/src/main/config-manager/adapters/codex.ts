import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const PROXY_PROVIDER_KEY = 'ccmodels';

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
        const sectionMatch = line.match(/^\[([\w.]+)\]/);
        if (sectionMatch) {
          section = sectionMatch[1];
          result[section] = result[section] ?? {};
          continue;
        }
        const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (kvMatch) {
          const key = kvMatch[1].trim();
          const rawValue = kvMatch[2].trim();
          const value = rawValue.replace(/^"|"$/g, '');
          if (section) {
            (result[section] as Record<string, unknown>)[key] = value;
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    } catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const sections = new Map<string, Record<string, unknown>>();
    const topLevel: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sections.set(key, value as Record<string, unknown>);
      } else {
        topLevel[key] = String(value);
      }
    }

    let output = '';
    for (const [k, v] of Object.entries(topLevel)) {
      output += `${k} = "${v}"\n`;
    }
    if (Object.keys(topLevel).length > 0) output += '\n';

    for (const [section, values] of sections) {
      output += `[${section}]\n`;
      for (const [key, value] of Object.entries(values)) {
        output += `${key} = "${value}"\n`;
      }
      output += '\n';
    }
    fs.writeFileSync(filePath, output, 'utf-8');
  },

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const port = opts?.port || 15721;

    // Build the proxy provider entry
    // Use a dummy api_key — the real key is injected by the local proxy
    const providerEntry: Record<string, unknown> = {
      name: 'CC Models Proxy',
      base_url: `http://127.0.0.1:${port}/v1`,
      api_key: 'ccmodels-proxy',
      wire_api: 'responses',
    };

    // Merge with existing model_providers entries, adding/replacing ccmodels
    const existingProviders: Record<string, unknown> = {};
    for (const [sectionKey, value] of Object.entries(config)) {
      if (sectionKey.startsWith('model_providers.') && typeof value === 'object' && value !== null) {
        existingProviders[sectionKey] = value as Record<string, unknown>;
      }
    }
    existingProviders[`model_providers.${PROXY_PROVIDER_KEY}`] = providerEntry;

    const result: Record<string, unknown> = {};
    // Preserve all non-model_providers sections and non-provider top-level keys
    for (const [key, value] of Object.entries(config)) {
      if (!key.startsWith('model_providers.')) {
        result[key] = value;
      }
    }
    // Set top-level model_provider to our proxy
    result.model_provider = PROXY_PROVIDER_KEY;
    // Merge back all model_providers entries
    Object.assign(result, existingProviders);

    return result;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    // Remove our ccmodels provider entry
    const proxySection = `model_providers.${PROXY_PROVIDER_KEY}`;
    const proxyConfig = config[proxySection] as Record<string, unknown> | undefined;
    if (proxyConfig && typeof proxyConfig.base_url === 'string' && proxyConfig.base_url.startsWith('http://127.0.0.1:')) {
      delete config[proxySection];
    }

    // Remove top-level model_provider if it points to our proxy
    if (config.model_provider === PROXY_PROVIDER_KEY) {
      delete config.model_provider;
    }

    return config;
  },
};
