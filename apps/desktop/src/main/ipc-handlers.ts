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
import * as mcpDb from './database/mcp';
import * as skillDb from './database/skills';
import * as promptDb from './database/prompts';
import * as syncQueueDb from './database/sync-queue';
import { startMcpServer, stopMcpServer, getMcpProcessStatus } from './mcp-manager';
import { triggerSync } from './sync';

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

  // ── MCP handlers ──
  ipcMain.handle('mcp:list', () => mcpDb.getAllMcpServers());
  ipcMain.handle('mcp:get', (_e, id) => mcpDb.getMcpServerById(id));
  ipcMain.handle('mcp:create', (_e, data) => mcpDb.createMcpServer(data));
  ipcMain.handle('mcp:update', (_e, id, data) => mcpDb.updateMcpServer(id, data));
  ipcMain.handle('mcp:delete', (_e, id) => mcpDb.deleteMcpServer(id));
  ipcMain.handle('mcp:setEnabled', (_e, id, enabled) => { mcpDb.setMcpEnabled(id, enabled); if (enabled) { const server = mcpDb.getMcpServerById(id); if (server) startMcpServer(server); } else { stopMcpServer(id); } });
  ipcMain.handle('mcp:start', (_e, id) => { const s = mcpDb.getMcpServerById(id); return s ? startMcpServer(s) : false; });
  ipcMain.handle('mcp:stop', (_e, id) => stopMcpServer(id));
  ipcMain.handle('mcp:status', (_e, id) => getMcpProcessStatus(id));

  // ── Skills handlers ──
  ipcMain.handle('skill:list', () => skillDb.getAllSkills());
  ipcMain.handle('skill:get', (_e, id) => skillDb.getSkillById(id));
  ipcMain.handle('skill:create', (_e, data) => skillDb.createSkill(data));
  ipcMain.handle('skill:update', (_e, id, data) => skillDb.updateSkill(id, data));
  ipcMain.handle('skill:delete', (_e, id) => skillDb.deleteSkill(id));
  ipcMain.handle('skill:setActive', (_e, id, active) => { skillDb.setSkillActive(id, active); });
  ipcMain.handle('skill:checkConflict', (_e, name, excludeId) => skillDb.checkSkillConflict(name, excludeId));

  // ── Prompts handlers ──
  ipcMain.handle('prompt:list', () => promptDb.getAllPrompts());
  ipcMain.handle('prompt:get', (_e, id) => promptDb.getPromptById(id));
  ipcMain.handle('prompt:create', (_e, data) => promptDb.createPrompt(data));
  ipcMain.handle('prompt:update', (_e, id, data) => promptDb.updatePrompt(id, data));
  ipcMain.handle('prompt:delete', (_e, id) => promptDb.deletePrompt(id));
  ipcMain.handle('prompt:setActive', (_e, id, active) => { promptDb.setPromptActive(id, active); });

  // ── Sync handlers ──
  ipcMain.handle('sync:status', () => syncQueueDb.getSyncStatus());
  ipcMain.handle('sync:trigger', () => triggerSync());
}
