import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const CONFIG_PATH = path.join(HOME, '.openclaw', 'openclaw.json');
const PROXY_PROVIDER_KEY = 'ccmodels';

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export const openclawAdapter: CliAdapter = {
  name: 'openclaw',
  configPaths: [CONFIG_PATH],

  readConfig(filePath: string): Record<string, unknown> {
    return readJson(filePath);
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    writeJson(filePath, config);
  },

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const port = opts?.port || 15721;
    const models = opts?.models || [];
    const apiKey = opts?.apiKey || 'ccmodels-proxy';

    const result = { ...config };

    // Build models.providers
    const modelsSection = (result.models && typeof result.models === 'object')
      ? { ...(result.models as Record<string, unknown>) }
      : {};
    const providers = (modelsSection.providers && typeof modelsSection.providers === 'object')
      ? { ...(modelsSection.providers as Record<string, unknown>) }
      : {};

    providers[PROXY_PROVIDER_KEY] = {
      baseUrl: `http://127.0.0.1:${port}/v1`,
      apiKey,
      api: 'openai-completions',
      models: models.length > 0
        ? models.map((id: string) => ({ id, name: id }))
        : [{ id: 'gpt-4o', name: 'GPT-4o' }],
    };

    modelsSection.providers = providers;
    if (!modelsSection.mode) {
      modelsSection.mode = 'merge';
    }
    result.models = modelsSection;

    // Set default model in agents.defaults
    const firstModelId = models.length > 0 ? models[0] : 'gpt-4o';
    const agents = (result.agents && typeof result.agents === 'object')
      ? { ...(result.agents as Record<string, unknown>) }
      : { defaults: {} };
    const defaults = (agents.defaults && typeof agents.defaults === 'object')
      ? { ...(agents.defaults as Record<string, unknown>) }
      : {};

    defaults.model = {
      primary: `${PROXY_PROVIDER_KEY}/${firstModelId}`,
    };
    defaults.models = {
      [`${PROXY_PROVIDER_KEY}/${firstModelId}`]: {},
    };
    agents.defaults = defaults;
    result.agents = agents;

    return result;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const result = { ...config };

    // Remove our proxy provider from models.providers
    if (result.models && typeof result.models === 'object') {
      const modelsSection = { ...(result.models as Record<string, unknown>) };
      if (modelsSection.providers && typeof modelsSection.providers === 'object') {
        const providers = { ...(modelsSection.providers as Record<string, unknown>) };
        const proxyEntry = providers[PROXY_PROVIDER_KEY];
        if (proxyEntry && typeof proxyEntry === 'object') {
          const entry = proxyEntry as Record<string, unknown>;
          if (typeof entry.baseUrl === 'string' && entry.baseUrl.includes('127.0.0.1')) {
            delete providers[PROXY_PROVIDER_KEY];
          }
        }
        if (Object.keys(providers).length > 0) {
          modelsSection.providers = providers;
        } else {
          delete modelsSection.providers;
        }
      }
      result.models = modelsSection;
    }

    // Restore agents.defaults.model if it pointed to our proxy
    if (result.agents && typeof result.agents === 'object') {
      const agents = { ...(result.agents as Record<string, unknown>) };
      const defaults = agents.defaults && typeof agents.defaults === 'object'
        ? { ...(agents.defaults as Record<string, unknown>) }
        : {};
      if (defaults.model && typeof defaults.model === 'object') {
        const model = defaults.model as Record<string, unknown>;
        if (typeof model.primary === 'string' && model.primary.startsWith(`${PROXY_PROVIDER_KEY}/`)) {
          delete defaults.model;
          delete defaults.models;
        }
      }
      agents.defaults = defaults;
      result.agents = agents;
    }

    return result;
  },
};
