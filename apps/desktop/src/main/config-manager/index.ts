import { getAdapter } from './adapters';
import { backupConfigFile } from './backup';
import { initConfigWatcher } from './watcher';
import { scanCliTools } from './scanner';
import { getCliTools } from '@ccmodels/shared';
import { getSettings } from '../database/settings';
import { getActiveProvider, getAllProviders, getProviderById, getToolActiveProviderId, getToolProviderList } from '../database/providers';
import { writeHermesEnv } from './adapters/hermes';
import fs from 'node:fs';

let initialized = false;
let applyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 3000;

/**
 * Apply proxy config to all installed CLI tools.
 * This is the single shared function used by startup, port change, provider change, etc.
 */
export function applyAllToolConfigs(): void {
  try {
    const statuses = scanCliTools();
    for (const s of statuses) {
      if (s.installed) {
        try {
          const result = applyConfig(s.name);
          console.log(`[CC Config] ${s.name}: ${result.success ? 'OK' : 'FAIL'} — ${result.message}`);
        } catch (toolErr: any) {
          console.error(`[CC Config] Error configuring ${s.name}:`, toolErr);
        }
      }
    }
  } catch (err: any) {
    console.error('[CC Config] applyAllToolConfigs failed:', err);
  }
}

function debouncedApplyAll(): void {
  if (applyDebounceTimer) clearTimeout(applyDebounceTimer);
  applyDebounceTimer = setTimeout(applyAllToolConfigs, DEBOUNCE_MS);
}

export function initConfigManager(): void {
  if (initialized) return;
  initialized = true;

  const settings = getSettings();
  console.log('[CC Config] autoConfigCli:', settings.autoConfigCli);

  if (!settings.autoConfigCli) return;

  // Auto-configure all installed CLI tools on every startup
  applyAllToolConfigs();

  // Watch for new CLI installations — debounce to prevent self-triggered loops
  initConfigWatcher(() => {
    debouncedApplyAll();
  });
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

export function applyConfig(toolName: string): { success: boolean; message: string } {
  const tool = getCliTools().find((t) => t.name === toolName);
  if (!tool) return { success: false, message: `Unknown tool: ${toolName}` };

  const adapter = getAdapter(toolName);
  if (!adapter) return { success: false, message: `No adapter for: ${toolName}` };

  // Look up provider with tool-specific priority:
  // 1. Tool-specific active provider
  // 2. First provider in tool's list
  // 3. Global active provider
  // 4. Any provider with an API key
  //
  // claude-desktop always shares claude-code's provider (aliased in getProviderForTool)
  let provider = null;
  const lookupName = toolName === 'claude-desktop' ? 'claude-code' : toolName;
  const toolActiveId = getToolActiveProviderId(lookupName);
  if (toolActiveId) provider = getProviderById(toolActiveId);
  if (!provider) {
    const ids = getToolProviderList(lookupName);
    if (ids.length > 0) provider = getProviderById(ids[0]);
  }
  if (!provider) provider = getActiveProvider();
  if (!provider?.apiKey) {
    const allProviders = getAllProviders();
    provider = allProviders.find(p => p.apiKey) || null;
  }
  if (provider) {
    console.log('[CC Config] Provider for', toolName, ':', provider.name);
  }
  const apiKey = provider?.apiKey || '';
  const models = provider?.models || [];
  const port = getSettings().proxyPort;

  // Write to ALL config paths (not just the first existing one)
  // Some tools like Gemini CLI need env vars in multiple locations
  const configPathsToWrite: string[] = [];
  const existingPath = tool.configPaths.find((p) => fs.existsSync(p));
  if (existingPath) {
    configPathsToWrite.push(existingPath);
    // Also write to any additional existing paths
    for (const p of tool.configPaths) {
      if (p !== existingPath && fs.existsSync(p)) {
        configPathsToWrite.push(p);
      }
    }
    // If the first path doesn't have a file yet, also write to non-existing additional paths
    // (e.g. gemini-cli needs ~/.env created even if it doesn't exist yet)
    for (const p of tool.configPaths) {
      if (!configPathsToWrite.includes(p) && p !== tool.configPaths[0]) {
        configPathsToWrite.push(p);
      }
    }
  } else {
    // No config exists yet — write to all tool config paths
    configPathsToWrite.push(...tool.configPaths);
  }

  let lastError: string | null = null;
  let wroteAny = false;

  for (const configPath of configPathsToWrite) {
    try {
      backupConfigFile(toolName, configPath);

      let config: Record<string, unknown>;
      if (fs.existsSync(configPath)) {
        config = adapter.readConfig(configPath);
      } else {
        config = {};
      }
      const modified = adapter.applyProxy(config, { apiKey, models, port });
      const existingStr = JSON.stringify(sortKeys(config));
      const modifiedStr = JSON.stringify(sortKeys(modified));
      if (existingStr === modifiedStr) {
        continue;
      }
      adapter.writeConfig(configPath, modified);
      wroteAny = true;
    } catch (err: any) {
      console.error(`[CC Config] Error writing to ${configPath}:`, err);
      lastError = err.message;
    }
  }

  // Write Hermes .env file with API key
  if (toolName === 'hermes' && apiKey) {
    writeHermesEnv(apiKey);
  }

  if (wroteAny) {
    return { success: true, message: `Configured ${toolName} to use local proxy (${configPathsToWrite.length} path(s))` };
  }
  return { success: false, message: lastError || `No config paths for: ${toolName}` };
}

export function restoreConfig(toolName: string): { success: boolean; message: string } {
  const tool = getCliTools().find((t) => t.name === toolName);
  if (!tool) return { success: false, message: `Unknown tool: ${toolName}` };

  const adapter = getAdapter(toolName);
  if (!adapter) return { success: false, message: `No adapter for: ${toolName}` };

  let lastError: string | null = null;
  let restoredAny = false;

  for (const configPath of tool.configPaths) {
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = adapter.readConfig(configPath);
      const restored = adapter.restoreOriginal(config);
      adapter.writeConfig(configPath, restored);
      restoredAny = true;
    } catch (err: any) {
      console.error(`[CC Config] Error restoring ${configPath}:`, err);
      lastError = err.message;
    }
  }

  if (restoredAny) {
    return { success: true, message: `Restored config for ${toolName}` };
  }
  return { success: false, message: lastError || 'Config file not found' };
}

export { scanCliTools };
