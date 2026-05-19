import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

function getBackupDir(): string {
  return path.join(app.getPath('userData'), 'config-backups');
}

export function getBackupInfo(toolName: string): string | null {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(toolName + '-'))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return path.join(dir, files[0]);
}

export function backupConfigFile(toolName: string, configPath: string): string | null {
  if (!fs.existsSync(configPath)) return null;

  const dir = getBackupDir();
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(dir, `${toolName}-${timestamp}.json`);
  fs.copyFileSync(configPath, backupPath);
  return backupPath;
}
