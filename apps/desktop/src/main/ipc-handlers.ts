import { ipcMain, BrowserWindow } from 'electron';

// Stub IPC handlers — will be fully implemented in Task 5
export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  ipcMain.handle('provider:list', () => []);
  ipcMain.handle('settings:get', () => ({
    theme: 'system' as const,
    locale: 'zh-CN' as const,
    autoStart: false,
    lightweightMode: false,
    proxyPort: 15721,
    autoConfigCli: true,
    syncEnabled: false,
    syncInterval: 60,
  }));
  ipcMain.handle('proxy:status', () => ({ running: false, port: 15721, requests: 0 }));
  ipcMain.handle('config:scan', () => []);
}
