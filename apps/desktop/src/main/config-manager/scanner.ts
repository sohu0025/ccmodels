import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getAdapter } from './adapters';
import { getCliTools } from '@ccmodels/shared';
import type { CliToolStatus } from '@ccmodels/shared';
import { getBackupInfo } from './backup';

function isCliInstalled(toolName: string): boolean {
  // Fast path: Check known installation paths first
  const knownPaths: string[] = [];
  
  switch (toolName) {
    case 'claude-code': {
      // Check common installation paths for Claude Code
      const localAppData = process.env.LOCALAPPDATA || '';
      const appData = process.env.APPDATA || '';
      const userProfile = process.env.USERPROFILE || '';

      knownPaths.push(
        path.join(localAppData, 'Programs', 'claude-code', 'claude.exe'),
        path.join(appData, 'npm', 'claude.cmd'),
        path.join(userProfile, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
        path.join(userProfile, '.claude', 'claude.exe'),
        path.join(userProfile, '.claude')
      );
      break;
    }
    case 'gemini-cli':
      // Directory is .gemini, not .gemini-cli
      knownPaths.push(
        path.join(process.env.USERPROFILE || '', '.gemini'),
        path.join(process.env.HOME || '', '.gemini')
      );
      break;
    case 'claude-desktop':
      // Check for Claude Desktop config file
      if (process.env.APPDATA) {
        knownPaths.push(path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json'));
      }
      knownPaths.push(
        path.join(process.env.HOME || '', 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        path.join(process.env.HOME || '', '.config', 'Claude', 'claude_desktop_config.json'),
      );
      break;
    default:
      // For other tools, check config directory (matches tool name)
      knownPaths.push(
        path.join(process.env.USERPROFILE || '', '.' + toolName),
        path.join(process.env.HOME || '', '.' + toolName)
      );
  }
  
  // Check known paths first (fast file existence check)
  for (const p of knownPaths) {
    if (fs.existsSync(p)) {
      return true;
    }
  }
  
  // Slow path: Try running the command (only as last resort)
  try {
    execSync(`${toolName} --version`, { stdio: 'ignore', windowsHide: true, timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

export function scanCliTools(): CliToolStatus[] {
  const results: CliToolStatus[] = [];
  const tools = getCliTools();
  for (const tool of tools) {
    try {
      // Find first existing config path, or fall back to the first listed path
      const existingPath = tool.configPaths.find((p) => fs.existsSync(p));
      const configPath = existingPath ?? tool.configPaths[0];

      // Check if CLI tool is installed (by checking executable)
      const installed = isCliInstalled(tool.name);
      const adapter = getAdapter(tool.name);

      let configured = false;
      if (installed && adapter && existingPath) {
        try {
          const config = adapter.readConfig(existingPath);
          const configStr = JSON.stringify(config);
          // Check if config already has proxy applied (look for proxy URL marker)
          if (configStr.includes('http://127.0.0.1:15721') || configStr.includes('ccmodels')) {
            configured = true;
          }
        } catch {
          configured = false;
        }
      }

      const backupInfo = getBackupInfo(tool.name);

      results.push({
        name: tool.name,
        installed,
        configured,
        configPath,
        backupPath: backupInfo,
      });
    } catch (err: any) {
      console.error(`[CC Scanner] Error scanning tool ${tool.name}:`, err);
      results.push({
        name: tool.name,
        installed: false,
        configured: false,
        configPath: tool.configPaths[0] || '',
        backupPath: null,
      });
    }
  }
  return results;
}
