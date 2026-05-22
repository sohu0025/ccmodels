import { claudeCodeAdapter } from './claude-code';
import { claudeDesktopAdapter } from './claude-desktop';
import { codexAdapter } from './codex';
import { geminiCliAdapter } from './gemini-cli';
import { opencodeAdapter } from './opencode';
import { openclawAdapter } from './openclaw';
import { hermesAdapter } from './hermes';

export interface CliProxyOptions {
  apiKey?: string;
  models?: string[];
  port?: number;
}

export interface CliAdapter {
  name: string;
  configPaths: string[];
  readConfig: (path: string) => Record<string, unknown>;
  writeConfig: (path: string, config: Record<string, unknown>) => void;
  applyProxy: (config: Record<string, unknown>, opts?: CliProxyOptions) => Record<string, unknown>;
  restoreOriginal: (config: Record<string, unknown>) => Record<string, unknown>;
}

export const adapters: Record<string, CliAdapter> = {
  'claude-code': claudeCodeAdapter,
  'claude-desktop': claudeDesktopAdapter,
  codex: codexAdapter,
  'gemini-cli': geminiCliAdapter,
  opencode: opencodeAdapter,
  openclaw: openclawAdapter,
  hermes: hermesAdapter,
};

export function getAdapter(name: string): CliAdapter | undefined {
  return adapters[name];
}
