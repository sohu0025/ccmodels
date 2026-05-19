import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();

export interface CliToolDefinition {
  name: string;
  displayName: string;
  configPaths: string[];
  configFormat: 'json' | 'toml' | 'yaml';
  fieldsToModify: Record<string, string>;
}

export const CLI_TOOLS: CliToolDefinition[] = [
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    configPaths: [
      path.join(HOME, '.claude', 'settings.json'),
      process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'settings.json') : '',
    ].filter(Boolean),
    configFormat: 'json',
    fieldsToModify: {
      'provider.baseUrl': 'http://127.0.0.1:15721',
      'apiKeyHelper': 'ccswitch',
    },
  },
  {
    name: 'codex',
    displayName: 'Codex',
    configPaths: [path.join(HOME, '.codex', 'config.toml')],
    configFormat: 'toml',
    fieldsToModify: { 'api.base_url': 'http://127.0.0.1:15721' },
  },
  {
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    configPaths: [path.join(HOME, '.gemini', 'config.json')],
    configFormat: 'json',
    fieldsToModify: { 'apiEndpoint': 'http://127.0.0.1:15721' },
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    configPaths: [path.join(HOME, '.opencode', 'config.json')],
    configFormat: 'json',
    fieldsToModify: { 'apiBase': 'http://127.0.0.1:15721' },
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    configPaths: [path.join(HOME, '.openclaw', 'config.yaml')],
    configFormat: 'yaml',
    fieldsToModify: { 'api.base_url': 'http://127.0.0.1:15721' },
  },
  {
    name: 'hermes',
    displayName: 'Hermes Agent',
    configPaths: [path.join(HOME, '.hermes', 'config.json')],
    configFormat: 'json',
    fieldsToModify: { 'apiBase': 'http://127.0.0.1:15721' },
  },
];
