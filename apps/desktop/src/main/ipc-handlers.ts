import { ipcMain, BrowserWindow } from 'electron';
import * as providerDb from './database/providers';
import * as settingDb from './database/settings';
import { PRESET_PROVIDERS } from '@ccswitch/shared';
import { getProxyStatus } from './proxy';
import { scanCliTools, applyConfig, restoreConfig } from './config-manager';
import * as usageDb from './database/usage';
import * as sessionDb from './database/sessions';
import * as speedTestDb from './database/speed-tests';
import * as budgetDb from './database/budget-alerts';

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

  // ── Proxy handlers ──
  ipcMain.handle('proxy:status', () => getProxyStatus());

  // ── Config manager handlers ──
  ipcMain.handle('config:scan', () => scanCliTools());
  ipcMain.handle('config:apply', (_e, toolName: string) => applyConfig(toolName));
  ipcMain.handle('config:restore', (_e, toolName: string) => restoreConfig(toolName));

  // ── Usage handlers ──
  ipcMain.handle('usage:stats', (_e, filter) => usageDb.getUsageStats(filter));
  ipcMain.handle('usage:daily', (_e, dateFrom, dateTo) => usageDb.getDailyUsage(dateFrom, dateTo));
  ipcMain.handle('usage:byProvider', (_e, dateFrom, dateTo) => usageDb.getProviderUsage(dateFrom, dateTo));
  ipcMain.handle('usage:byModel', (_e, dateFrom, dateTo) => usageDb.getModelUsage(dateFrom, dateTo));

  // ── Session handlers ──
  ipcMain.handle('session:list', (_e, filter) => sessionDb.listSessions(filter));
  ipcMain.handle('session:get', (_e, id) => sessionDb.getSessionById(id));
  ipcMain.handle('session:messages', (_e, sessionId) => sessionDb.getSessionMessages(sessionId));

  // ── Speed test handlers ──
  ipcMain.handle('speedtest:latest', (_e, limit) => speedTestDb.getLatestSpeedTests(limit));
  ipcMain.handle('speedtest:avgLatency', (_e, providerId, days) => speedTestDb.getProviderAvgLatency(providerId, days));
  ipcMain.handle('speedtest:successRate', (_e, providerId, days) => speedTestDb.getProviderSuccessRate(providerId, days));

  // ── Budget handlers ──
  ipcMain.handle('budget:status', () => budgetDb.getBudgetStatus());
  ipcMain.handle('budget:check', () => budgetDb.checkBudgetThreshold());
}
