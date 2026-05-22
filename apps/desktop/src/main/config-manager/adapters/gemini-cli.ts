import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();
const PROXY_URL_MARKER = 'http://127.0.0.1:';
const isWin = process.platform === 'win32';

/** Set a user-level environment variable on Windows (persists across shell sessions).
 *  Uses fire-and-forget spawn to avoid blocking the main thread or crashing
 *  the Electron process if `setx` hangs. */
function setWinUserEnv(key: string, value: string): void {
  try {
    spawn('setx', [key, value], { stdio: 'ignore', windowsHide: true, detached: true }).unref();
  } catch { /* ignore */ }
}

/** Delete a user-level environment variable on Windows. */
function deleteWinUserEnv(key: string): void {
  try {
    spawn('REG', ['delete', 'HKCU\\Environment', '/F', '/V', key], { stdio: 'ignore', windowsHide: true, detached: true }).unref();
  } catch { /* ignore */ }
}

export const geminiCliAdapter: CliAdapter = {
  name: 'gemini-cli',
  configPaths: [path.join(HOME, '.gemini', '.env'), path.join(HOME, '.env')],

  readConfig(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {};
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result: Record<string, unknown> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[key] = value;
      }
      return result;
    } catch { return {}; }
  },

  writeConfig(filePath: string, config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const lines: string[] = [];
    for (const [key, value] of Object.entries(config)) {
      lines.push(`${key}=${value}`);
    }
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  },

  applyProxy(config: Record<string, unknown>, opts?: CliProxyOptions): Record<string, unknown> {
    const port = opts?.port || 15721;
    // Google Gemini CLI (@google/gemini-cli) uses:
    //   GEMINI_API_KEY      - API key for authentication
    //   GOOGLE_GEMINI_BASE_URL - Base URL for proxy
    //   GEMINI_MODEL        - Default model name
    //
    // NOTE: GEMINI_MODEL must be a model name that gemini-cli recognizes in its
    // internal validation (e.g. "gemini-2.0-flash"). The proxy will override
    // the model to the actual provider model (opts?.models[0]) when forwarding.
    const geminiModelName = 'gemini-2.5-flash';
    const modified = {
      ...config,
      GEMINI_API_KEY: opts?.apiKey || 'ccmodels-proxy',
      GOOGLE_GEMINI_BASE_URL: `http://127.0.0.1:${port}`,
      GEMINI_MODEL: geminiModelName,
    };

    // On Windows, also set user-level env vars so they work regardless of CWD.
    // Only call setx if the value actually differs from the current config,
    // to avoid unnecessary registry writes that trigger watcher events.
    if (isWin) {
      if (config.GEMINI_API_KEY !== modified.GEMINI_API_KEY) {
        setWinUserEnv('GEMINI_API_KEY', modified.GEMINI_API_KEY as string);
      }
      if (config.GOOGLE_GEMINI_BASE_URL !== modified.GOOGLE_GEMINI_BASE_URL) {
        setWinUserEnv('GOOGLE_GEMINI_BASE_URL', modified.GOOGLE_GEMINI_BASE_URL as string);
      }
      if (config.GEMINI_MODEL !== modified.GEMINI_MODEL) {
        setWinUserEnv('GEMINI_MODEL', modified.GEMINI_MODEL as string);
      }
    }

    return modified;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const result = { ...config };
    // Remove GOOGLE_GEMINI_BASE_URL if it points to our proxy
    if (typeof result.GOOGLE_GEMINI_BASE_URL === 'string' && result.GOOGLE_GEMINI_BASE_URL.startsWith(PROXY_URL_MARKER)) {
      delete result.GOOGLE_GEMINI_BASE_URL;
    }
    if (result.GEMINI_API_KEY === 'ccmodels-proxy') {
      delete result.GEMINI_API_KEY;
    }

    // On Windows, clean up user-level env vars
    if (isWin) {
      deleteWinUserEnv('GEMINI_API_KEY');
      deleteWinUserEnv('GOOGLE_GEMINI_BASE_URL');
      deleteWinUserEnv('GEMINI_MODEL');
    }

    return result;
  },
};
