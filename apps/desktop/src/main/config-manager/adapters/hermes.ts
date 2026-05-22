import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.hermes');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.yaml');
const ENV_PATH = path.join(CONFIG_DIR, '.env');
const PROXY_PROVIDER_ID = 'cc-models-proxy';

export const hermesAdapter: CliAdapter = {
  name: 'hermes',
  configPaths: [CONFIG_PATH],

  readConfig(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {};
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(text);
      return (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const text = yaml.dump(config, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: true });
    fs.writeFileSync(filePath, text, 'utf-8');
  },

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const models = opts?.models || [];
    const port = opts?.port || 15721;

    const providers = (config.providers && typeof config.providers === 'object')
      ? { ...config.providers as Record<string, unknown> }
      : {};

    // Remove any existing proxy provider entry
    delete providers[PROXY_PROVIDER_ID];

    // Build model list
    const modelList = models.length > 0 ? [...models] : ['default'];

    // Add our proxy provider
    (providers as Record<string, unknown>)[PROXY_PROVIDER_ID] = {
      base_url: `http://127.0.0.1:${port}`,
      models: modelList,
    };

    const result: Record<string, unknown> = {
      ...config,
      providers,
    };

    // Set model as dict with provider + default model (not "provider/model" string)
    const firstModel = modelList[0];
    if (!result.model || (typeof result.model === 'string' && result.model.startsWith(`${PROXY_PROVIDER_ID}/`))) {
      result.model = {
        default: firstModel,
        provider: PROXY_PROVIDER_ID,
      };
    }

    return result;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const providers = (config.providers && typeof config.providers === 'object')
      ? { ...(config.providers as Record<string, unknown>) }
      : {};

    delete providers[PROXY_PROVIDER_ID];

    const result: Record<string, unknown> = {
      ...config,
    };

    // Clear model if it was our proxy model
    if (typeof result.model === 'object' && result.model !== null) {
      const modelObj = result.model as Record<string, unknown>;
      if (modelObj.provider === PROXY_PROVIDER_ID) {
        delete result.model;
      }
    } else if (typeof result.model === 'string' && (result.model as string).startsWith(`${PROXY_PROVIDER_ID}/`)) {
      delete result.model;
    }

    if (Object.keys(providers).length > 0) {
      result.providers = providers;
    } else {
      delete result.providers;
    }

    return result;
  },
};

/**
 * Write API key to Hermes .env file.
 */
export function writeHermesEnv(apiKey: string): void {
  if (!apiKey) return;
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
    const lines = existing.split('\n').filter(l => !l.startsWith('LM_API_KEY='));
    lines.push(`LM_API_KEY=${apiKey}`);
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
  } catch (err) {
    console.error('[CC Config] Failed to write Hermes .env:', err);
  }
}
