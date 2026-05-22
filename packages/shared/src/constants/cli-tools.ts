import path from 'node:path';

export interface CliToolDefinition {
  name: string;
  displayName: string;
  configPaths: string[];
  configFormat: 'json' | 'toml' | 'yaml';
  fieldsToModify: Record<string, string>;
}

let _cliTools: CliToolDefinition[] | null = null;

function getHomeDir(): string {
  try {
    return require('node:os').homedir();
  } catch {
    return '~'; // Fallback for browser/renderer context
  }
}

export function getCliTools(): CliToolDefinition[] {
  if (_cliTools) return _cliTools;
  const HOME = getHomeDir();
  _cliTools = [
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
      'apiKeyHelper': 'ccmodels',
    },
  },
  {
    name: 'claude-desktop',
    displayName: 'Claude Desktop',
    configPaths: [
      process.env.APPDATA ? path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json') : '',
      path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      path.join(HOME, '.config', 'Claude', 'claude_desktop_config.json'),
    ].filter(Boolean),
    configFormat: 'json',
    fieldsToModify: { 'api.baseUrl': 'http://127.0.0.1:15721' },
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
    configPaths: [path.join(HOME, '.gemini', '.env'), path.join(HOME, '.env')],
    configFormat: 'json',
    fieldsToModify: { GOOGLE_GEMINI_BASE_URL: 'http://127.0.0.1:15721' },
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    configPaths: [path.join(HOME, '.config', 'opencode', 'opencode.jsonc')],
    configFormat: 'json',
    fieldsToModify: {
      'provider.*.options.baseURL': 'http://127.0.0.1:15721',
    },
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    configPaths: [path.join(HOME, '.openclaw', 'openclaw.json')],
    configFormat: 'json',
    fieldsToModify: { 'models.providers.*.baseUrl': 'http://127.0.0.1:15721/v1' },
  },
  {
    name: 'hermes',
    displayName: 'Hermes Agent',
    configPaths: [path.join(HOME, '.hermes', 'config.yaml')],
    configFormat: 'yaml',
    fieldsToModify: { 'providers.*.api_base': 'http://127.0.0.1:15721' },
  },
  ];
  return _cliTools;
}
