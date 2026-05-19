import { ipcMain, BrowserWindow } from 'electron';
import * as providerDb from './database/providers';
import * as settingDb from './database/settings';
import { PRESET_PROVIDERS } from '@ccswitch/shared';

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  // ── Provider handlers (real database) ──
  ipcMain.handle('provider:list', () => providerDb.getAllProviders());

  ipcMain.handle('provider:get', (_e, id: string) => providerDb.getProviderById(id));

  ipcMain.handle('provider:create', (_e, data) => providerDb.createProvider(data));

  ipcMain.handle('provider:update', (_e, { id, data }) => providerDb.updateProvider(id, data));

  ipcMain.handle('provider:delete', (_e, id: string) => providerDb.deleteProvider(id));

  ipcMain.handle('provider:setActive', (_e, id: string) => providerDb.setActiveProvider(id));

  ipcMain.handle('provider:presets', () => PRESET_PROVIDERS);

  // ── Settings handlers (real database) ──
  ipcMain.handle('settings:get', () => settingDb.getSettings());

  ipcMain.handle('settings:update', (_e, data) => settingDb.updateSettings(data));

  // ── Proxy handlers (stub — Task 6) ──
  ipcMain.handle('proxy:status', () => ({ running: false, port: 15721, requests: 0 }));

  // ── Config manager handlers (stub — Task 7) ──
  ipcMain.handle('config:scan', () => []);
  ipcMain.handle('config:apply', (_e, _toolName: string) => ({
    success: false,
    message: 'Not implemented yet',
  }));
  ipcMain.handle('config:restore', (_e, _toolName: string) => ({
    success: false,
    message: 'Not implemented yet',
  }));
}
