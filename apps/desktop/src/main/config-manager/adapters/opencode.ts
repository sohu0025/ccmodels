import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const PROXY_PROVIDER_ID = 'cc-models-proxy';

export const opencodeAdapter: CliAdapter = {
  name: 'opencode',
  configPaths: [path.join(HOME, '.config', 'opencode', 'opencode.jsonc')],

  readConfig(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {};
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  },

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const port = opts?.port || 15721;
    const models = opts?.models || [];
    const proxyUrl = `http://127.0.0.1:${port}`;

    // Build models object from provider's model list
    const modelEntries: Record<string, { name: string }> = {};
    for (const m of models) {
      modelEntries[m] = { name: m };
    }

    const providerEntry: Record<string, unknown> = {
      options: {
        baseURL: proxyUrl,
        apiKey: '',
      },
      models: modelEntries,
    };

    // If there were existing providers, keep their original baseURLs for restoration
    const savedBaseUrls: Record<string, string> = {};
    const oldProviders = (config as any).provider;
    if (oldProviders && typeof oldProviders === 'object') {
      for (const [id, prov] of Object.entries(oldProviders)) {
        const p = prov as any;
        if (p?.options?.baseURL && typeof p.options.baseURL === 'string'
            && !p.options.baseURL.includes('127.0.0.1')) {
          savedBaseUrls[id] = p.options.baseURL;
        }
      }
    }

    // Build new provider map: restore non-proxy providers as-is, add our proxy provider
    const newProviders: Record<string, unknown> = {};
    if (oldProviders && typeof oldProviders === 'object') {
      for (const [id, prov] of Object.entries(oldProviders)) {
        if (savedBaseUrls[id]) {
          // Non-proxy provider — keep it as-is
          newProviders[id] = prov;
        }
        // Proxy providers (baseURL contains 127.0.0.1) are replaced by our entry
      }
    }

    // Add our proxy provider (replaces any existing proxy entry)
    if (Object.keys(modelEntries).length > 0) {
      newProviders[PROXY_PROVIDER_ID] = providerEntry;
    }

    const result: Record<string, unknown> = {
      ...config,
      provider: newProviders,
    };

    // Save original baseURLs for restoration
    if (Object.keys(savedBaseUrls).length > 0) {
      result.__ccModelsOrigBaseUrls = savedBaseUrls;
    }

    // Set default model if models exist and no model is set
    if (models.length > 0 && !result.model) {
      result.model = `${PROXY_PROVIDER_ID}/${models[0]}`;
    }

    return result;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    // Remove our proxy provider entry
    const oldProviders = (config as any).provider;
    const newProviders: Record<string, unknown> = {};

    if (oldProviders && typeof oldProviders === 'object') {
      for (const [id, prov] of Object.entries(oldProviders)) {
        if (id === PROXY_PROVIDER_ID) continue; // Remove our proxy entry
        newProviders[id] = prov;
      }
    }

    // Restore original baseURLs from saved data
    const saved = (config as any).__ccModelsOrigBaseUrls;
    if (saved && typeof saved === 'object') {
      for (const [id, url] of Object.entries(saved)) {
        const p = (newProviders as any)[id];
        if (p?.options) {
          p.options.baseURL = url;
        }
      }
    }

    const result: Record<string, unknown> = {
      ...config,
      provider: newProviders,
    };
    delete (result as any).__ccModelsOrigBaseUrls;
    delete result.model;

    // If there are no other providers, remove the provider field entirely
    if (Object.keys(newProviders).length === 0) {
      delete result.provider;
    }

    return result;
  },
};
