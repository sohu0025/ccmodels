import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const configPaths = [path.join(HOME, '.claude', 'settings.json')];
if (process.env.APPDATA) {
  configPaths.push(path.join(process.env.APPDATA, 'Claude', 'settings.json'));
}

/** Env vars that would bypass or conflict with the local proxy */
const CONFLICTING_ENV_KEYS = ['ANTHROPIC_COOKIE'];

function buildEnv(
  originalEnv: Record<string, string> | undefined,
  apiKey: string,
  models: string[],
  port: number,
): { env: Record<string, string>; backup: Record<string, string> } {
  const backup: Record<string, string> = {};

  if (originalEnv?.ANTHROPIC_AUTH_TOKEN) backup.ANTHROPIC_AUTH_TOKEN = originalEnv.ANTHROPIC_AUTH_TOKEN;
  if (originalEnv?.ANTHROPIC_BASE_URL) backup.ANTHROPIC_BASE_URL = originalEnv.ANTHROPIC_BASE_URL;
  if (originalEnv?.ANTHROPIC_COOKIE) backup.ANTHROPIC_COOKIE = originalEnv.ANTHROPIC_COOKIE;

  const env = { ...originalEnv };
  for (const key of CONFLICTING_ENV_KEYS) delete env[key];

  env.ANTHROPIC_AUTH_TOKEN = apiKey;
  env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;

  const m0 = models[0] || 'default';
  const m1 = models[1] || m0;
  env.ANTHROPIC_MODEL = m0;
  env.ANTHROPIC_DEFAULT_HAIKU_MODEL = m0;
  env.ANTHROPIC_DEFAULT_SONNET_MODEL = m1;
  env.ANTHROPIC_DEFAULT_OPUS_MODEL = m1;

  return { env, backup };
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

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const env = config.env as Record<string, string> | undefined;
    const key = opts?.apiKey || '';
    const models = opts?.models?.length ? opts.models : ['default'];
    const port = opts?.port || 15721;

    const { env: newEnv, backup } = buildEnv(env, key, models, port);

    return {
      ...config,
      env: newEnv,
      includeCoAuthoredBy: false,
      ...(Object.keys(backup).length > 0 ? { _ccmodels_env_backup: backup } : {}),
    };
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const { _ccmodels_env_backup, ...rest } = config as Record<string, unknown>;

    const env = (rest.env as Record<string, string>) ?? {};
    if (env.ANTHROPIC_BASE_URL && env.ANTHROPIC_BASE_URL.startsWith('http://127.0.0.1:')) {
      delete env.ANTHROPIC_BASE_URL;
    }
    if (_ccmodels_env_backup) {
      const restored = { ...env, ...(_ccmodels_env_backup as Record<string, string>) };
      if (Object.keys(restored).length > 0) {
        rest.env = restored;
      } else {
        delete rest.env;
      }
    } else if (Object.keys(env).length === 0) {
      delete rest.env;
    }

    return rest;
  },
};