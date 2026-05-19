import fs from 'node:fs';
import { getAdapter } from './adapters';
import { CLI_TOOLS } from '@ccswitch/shared';
import type { CliToolStatus } from '@ccswitch/shared';
import { getBackupInfo } from './backup';

export function scanCliTools(): CliToolStatus[] {
  return CLI_TOOLS.map((tool) => {
    // Find first existing config path, or fall back to the first listed path
    const existingPath = tool.configPaths.find((p) => fs.existsSync(p));
    const configPath = existingPath ?? tool.configPaths[0];
    const installed = !!existingPath;
    const adapter = getAdapter(tool.name);

    let configured = false;
    if (installed && adapter && existingPath) {
      try {
        const config = adapter.readConfig(existingPath);
        // Check if config is already proxied by comparing with proxy-applied version
        const proxyConfig = adapter.applyProxy(structuredClone(config));
        configured = JSON.stringify(config) === JSON.stringify(proxyConfig);
      } catch {
        configured = false;
      }
    }

    const backupInfo = getBackupInfo(tool.name);

    return {
      name: tool.name,
      installed,
      configured,
      configPath,
      backupPath: backupInfo,
    };
  });
}
