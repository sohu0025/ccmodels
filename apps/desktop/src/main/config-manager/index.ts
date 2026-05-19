import { getAdapter } from './adapters';
import { backupConfigFile } from './backup';
import { initConfigWatcher } from './watcher';
import { scanCliTools } from './scanner';
import { CLI_TOOLS } from '@ccswitch/shared';
import { getSettings } from '../database/settings';
import fs from 'node:fs';

let initialized = false;

export function initConfigManager(): void {
  if (initialized) return;
  initialized = true;

  const settings = getSettings();
  if (!settings.autoConfigCli) return;

  // Auto-configure all installed CLI tools
  const statuses = scanCliTools();
  for (const status of statuses) {
    if (status.installed && !status.configured) {
      applyConfig(status.name);
    }
  }

  // Watch for new CLI installations
  initConfigWatcher(() => {
    const updated = scanCliTools();
    for (const status of updated) {
      if (status.installed && !status.configured) {
        applyConfig(status.name);
      }
    }
  });
}

export function applyConfig(toolName: string): { success: boolean; message: string } {
  const tool = CLI_TOOLS.find((t) => t.name === toolName);
  if (!tool) return { success: false, message: `Unknown tool: ${toolName}` };

  const adapter = getAdapter(toolName);
  if (!adapter) return { success: false, message: `No adapter for: ${toolName}` };

  const configPath = tool.configPaths.find((p) => fs.existsSync(p));

  try {
    if (configPath) {
      // Backup existing config
      backupConfigFile(toolName, configPath);

      // Apply proxy config
      const config = adapter.readConfig(configPath);
      const modified = adapter.applyProxy(config);
      adapter.writeConfig(configPath, modified);

      return { success: true, message: `Configured ${configPath} to use local proxy` };
    } else {
      // Config file doesn't exist yet — create one pointing to proxy
      const newPath = tool.configPaths[0];
      adapter.writeConfig(newPath, adapter.applyProxy({}));

      return { success: true, message: `Created config at ${newPath}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export function restoreConfig(toolName: string): { success: boolean; message: string } {
  const tool = CLI_TOOLS.find((t) => t.name === toolName);
  if (!tool) return { success: false, message: `Unknown tool: ${toolName}` };

  const adapter = getAdapter(toolName);
  if (!adapter) return { success: false, message: `No adapter for: ${toolName}` };

  const configPath = tool.configPaths.find((p) => fs.existsSync(p));
  if (!configPath) return { success: false, message: 'Config file not found' };

  try {
    const config = adapter.readConfig(configPath);
    const restored = adapter.restoreOriginal(config);
    adapter.writeConfig(configPath, restored);

    return { success: true, message: `Restored ${configPath}` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export { scanCliTools };
