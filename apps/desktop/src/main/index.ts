import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createMainWindow } from './window';
import { registerIpcHandlers } from './ipc-handlers';
import { initDatabase, closeDatabase, getDb } from './database';
import { getSettings, updateSettings } from './database/settings';
import { startProxy } from './proxy';
import { initConfigManager } from './config-manager';
import { stopConfigWatcher } from './config-manager/watcher';
import { initTray } from './tray';
import { startSpeedTesting, stopSpeedTesting } from './speed-test';
import { startBudgetChecking, stopBudgetChecking } from './budget-checker';
import { startAllMcpServers, stopAllMcpServers } from './mcp-manager';
import { startSyncDaemon, stopSyncDaemon } from './sync';
import { initAutoUpdater } from './updater';
import { startPort80Proxy, stopPort80Proxy } from './port80-proxy';
import { initSentry } from './sentry';

let mainWindow: BrowserWindow | null = null;

// Set app identity for Windows
app.setAppUserModelId('io.ccmodels.app');
process.title = 'CC Models';

// Ensure consistent database path across dev and production
app.setPath('userData', path.join(app.getPath('appData'), 'CC Models'));

app.on('will-quit', () => {
  stopSpeedTesting();
  stopBudgetChecking();
  stopAllMcpServers();
  stopSyncDaemon();
  stopConfigWatcher();
  stopPort80Proxy();
  closeDatabase();
});

// Global error handler to prevent silent crashes from blocking UI startup
process.on('uncaughtException', (err) => {
  console.error('[CC Models] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CC Models] Unhandled rejection:', reason);
});

async function bootstrap() {
  await app.whenReady();
  app.setLoginItemSettings({ openAtLogin: true });
  mainWindow = createMainWindow();
  try {
    initSentry();
    initDatabase();
    // Read installer-config.json from app resources if present
    try {
      const resourcePath = app.isPackaged
        ? path.join(process.resourcesPath, 'installer-config.json')
        : path.join(__dirname, '../../installer-config.json');
      if (fs.existsSync(resourcePath)) {
        const installerConfig = JSON.parse(fs.readFileSync(resourcePath, 'utf-8'));
        const updates: Record<string, string> = {};
        if (installerConfig.serverUrl) {
          updates.serverUrl = installerConfig.serverUrl;
          console.log('[CC Models] Applied server URL from installer config:', installerConfig.serverUrl);
        }
        if (installerConfig.websiteUrl) {
          updates.websiteUrl = installerConfig.websiteUrl;
        }
        if (installerConfig.latestVersion) {
          updates.latestVersion = installerConfig.latestVersion;
        }
        if (installerConfig.downloadUrl) {
          updates.downloadUrl = installerConfig.downloadUrl;
        }
        if (Object.keys(updates).length > 0) {
          updateSettings(updates as any);
        }
      }
    } catch (e) {
      console.error('[CC Models] Failed to read installer config:', e);
    }

    startProxy().catch((err) => console.error('[CC Models]', err.message));
    try {
      initConfigManager();
    } catch (initErr: any) {
      console.error('[CC Models] Config manager init failed:', initErr);
    }
    initTray(mainWindow);
    registerIpcHandlers(mainWindow);
    if (mainWindow) initAutoUpdater(mainWindow);
    startAllMcpServers();
    startSyncDaemon();
    checkForUpdatesOnStartup();
    startSpeedTesting();
    startBudgetChecking();
    startPort80Proxy();
    trackDevice();
  } catch (err) {
    console.error('[CC Models] Failed to initialize native modules (better-sqlite3):', err);
    console.error('[CC Models] UI will load but database features are unavailable.');
  }
}

function trackDevice(): void {
  try {
    const db = getDb();
    let row = db.prepare("SELECT value FROM settings WHERE key = 'deviceId'").get() as { value: string } | undefined;
    const isNew = !row;
    if (isNew) {
      row = { value: randomUUID() };
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('deviceId', ?)").run(row.value);
    }
    const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'syncServerUrl'").get() as { value: string } | undefined;
    const serverUrl = urlRow?.value || 'http://localhost:3000';
    if (isNew) {
      fetch(`${serverUrl}/api/stats/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: row!.value }) }).catch(() => {});
    } else {
      fetch(`${serverUrl}/api/stats/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: row!.value }) }).catch(() => {});
    }
  } catch { /* Non-critical */ }
}

async function checkForUpdatesOnStartup(): Promise<void> {
  try {
    const settings = getSettings();
    const currentVersion = app.getVersion();
    // Try fetching from server first, fall back to installer-baked values
    let latestVersion = '';
    let downloadUrl = '';
    if (settings.serverUrl) {
      try {
        const res = await fetch(`${settings.serverUrl}/api/system-settings`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json() as any;
          latestVersion = (data.latestVersion || '').trim();
          downloadUrl = (data.downloadUrl || '').trim();
        }
      } catch { /* fall through to baked-in values */ }
    }
    if (!latestVersion) {
      latestVersion = (settings as any).latestVersion || '';
      downloadUrl = (settings as any).downloadUrl || '';
    }
    if (!latestVersion || latestVersion === currentVersion) return;
    // Different version → prompt update
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title: '发现新版本',
      message: `当前版本: v${currentVersion}\n最新版本: v${latestVersion}`,
      detail: downloadUrl ? '是否前往下载页面获取最新版本？' : '',
      buttons: downloadUrl ? ['下载更新', '忽略'] : ['知道了'],
    });
    if (result.response === 0 && downloadUrl) {
      shell.openExternal(downloadUrl);
    }
  } catch { /* Non-critical */ }
}

app.on('window-all-closed', () => {
  // Keep running in tray - don't quit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
    if (mainWindow) {
      registerIpcHandlers(mainWindow);
    }
  }
});

bootstrap();
