import { ipcMain, BrowserWindow } from 'electron';
import type { AppSettings } from '@ccswitch/shared';

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  // Provider handlers
  ipcMain.handle('provider:list', () => []);
  ipcMain.handle('provider:get', (_e, _id: string) => null);
  ipcMain.handle('provider:create', (_e, _data: unknown) => {
    throw new Error('Not implemented');
  });
  ipcMain.handle('provider:update', (_e, _args: unknown) => {
    throw new Error('Not implemented');
  });
  ipcMain.handle('provider:delete', (_e, _id: string) => {});
  ipcMain.handle('provider:setActive', (_e, _id: string) => {});
  ipcMain.handle('provider:presets', () => []);

  // Settings handlers
  ipcMain.handle('settings:get', (): AppSettings => ({
    theme: 'system',
    locale: 'zh-CN',
    autoStart: false,
    lightweightMode: false,
    proxyPort: 15721,
    autoConfigCli: true,
    syncEnabled: false,
    syncInterval: 60,
  }));
  ipcMain.handle('settings:update', (_e, _data: unknown) => ({
    theme: 'system' as const,
    locale: 'zh-CN' as const,
    autoStart: false,
    lightweightMode: false,
    proxyPort: 15721,
    autoConfigCli: true,
    syncEnabled: false,
    syncInterval: 60,
  }));

  // Proxy handlers
  ipcMain.handle('proxy:status', () => ({ running: false, port: 15721, requests: 0 }));

  // Config manager handlers
  ipcMain.handle('config:scan', () => []);
  ipcMain.handle('config:apply', (_e, _toolName: string) => ({
    success: false,
    message: 'Not implemented',
  }));
  ipcMain.handle('config:restore', (_e, _toolName: string) => ({
    success: false,
    message: 'Not implemented',
  }));
}
