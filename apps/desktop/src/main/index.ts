import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerIpcHandlers } from './ipc-handlers';
import { initDatabase, closeDatabase } from './database';
import { startProxy } from './proxy';
import { initConfigManager } from './config-manager';
import { stopConfigWatcher } from './config-manager/watcher';
import { initTray } from './tray';
import { startSpeedTesting, stopSpeedTesting } from './speed-test';
import { startBudgetChecking, stopBudgetChecking } from './budget-checker';
import { startAllMcpServers, stopAllMcpServers } from './mcp-manager';
import { startSyncDaemon, stopSyncDaemon } from './sync';
import { initAutoUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;

app.on('will-quit', () => {
  stopSpeedTesting();
  stopBudgetChecking();
  stopAllMcpServers();
  stopSyncDaemon();
  stopConfigWatcher();
  closeDatabase();
});

async function bootstrap() {
  await app.whenReady();
  mainWindow = createMainWindow();
  initDatabase();
  startProxy();
  initConfigManager();
  initTray(mainWindow);
  registerIpcHandlers(mainWindow);
  if (mainWindow) initAutoUpdater(mainWindow);
  startAllMcpServers();
  startSyncDaemon();
  startSpeedTesting();
  startBudgetChecking();
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
