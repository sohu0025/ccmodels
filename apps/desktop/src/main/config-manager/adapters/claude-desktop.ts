import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { CliAdapter, CliProxyOptions } from './index';

const HOME = os.homedir();

function getConfigPaths(): string[] {
  const paths: string[] = [];
  // Windows
  if (process.env.APPDATA) {
    paths.push(path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json'));
  }
  // macOS
  paths.push(path.join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'));
  // Linux
  paths.push(path.join(HOME, '.config', 'Claude', 'claude_desktop_config.json'));
  return paths;
}

const configPaths = getConfigPaths();

export const claudeDesktopAdapter: CliAdapter = {
  name: 'claude-desktop',
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
    const port = opts?.port || 15721;
    const proxyUrl = `http://127.0.0.1:${port}`;

    // Update the api.baseUrl for Claude Desktop third-party API mode
    const api = (config.api as Record<string, unknown>) ?? {};
    const result: Record<string, unknown> = { ...config, api: { ...api, baseUrl: proxyUrl } };

    // Update cc-switch MCP server URL if present
    const mcpServers = (config.mcpServers as Record<string, unknown>) ?? {};
    if (mcpServers['cc-switch']) {
      const ccSwitch = { ...(mcpServers['cc-switch'] as Record<string, unknown>) };
      // Update url field for SSE/HTTP transport
      if (ccSwitch.url) {
        ccSwitch.url = proxyUrl;
      }
      result.mcpServers = { ...mcpServers, 'cc-switch': ccSwitch };
    }

    return result;
  },

  restoreOriginal(config: Record<string, unknown>): Record<string, unknown> {
    const result = { ...config };

    // Remove proxy URL from api section
    if (result.api) {
      const api = result.api as Record<string, unknown>;
      if (typeof api.baseUrl === 'string' && api.baseUrl.startsWith('http://127.0.0.1:')) {
        delete (api as Record<string, unknown>).baseUrl;
        result.api = Object.keys(api).length > 0 ? api : undefined;
      }
    }

    // Restore cc-switch MCP server if present
    if (result.mcpServers) {
      const mcpServers = result.mcpServers as Record<string, unknown>;
      const ccSwitch = mcpServers['cc-switch'] as Record<string, unknown> | undefined;
      if (ccSwitch && typeof ccSwitch.url === 'string' && ccSwitch.url.startsWith('http://127.0.0.1:')) {
        delete ccSwitch.url;
        if (Object.keys(ccSwitch).length === 0) {
          delete mcpServers['cc-switch'];
          result.mcpServers = Object.keys(mcpServers).length > 0 ? mcpServers : undefined;
        }
      }
    }

    return result;
  },
};
