import { ipcMain, BrowserWindow, shell, app } from 'electron';
import * as providerDb from './database/providers';
import * as settingDb from './database/settings';
import { PRESET_PROVIDERS, API_TYPE_TOOLS } from '@ccmodels/shared';
import { getProxyStatus, startProxy, stopProxy } from './proxy';
import { getAllCircuitStatuses } from './proxy/failover';
import { scanCliTools, applyConfig, restoreConfig, applyAllToolConfigs } from './config-manager';
import * as usageDb from './database/usage';
import * as sessionDb from './database/sessions';
import * as speedTestDb from './database/speed-tests';
import * as speedTest from './speed-test';
import * as budgetDb from './database/budget-alerts';
import * as mcpDb from './database/mcp';
import * as skillDb from './database/skills';
import * as promptDb from './database/prompts';
import * as syncQueueDb from './database/sync-queue';
import * as compareDb from './database/compare-tests';
import * as recommendDb from './database/recommendations';
import * as adDb from './database/ads';
import { startMcpServer, stopMcpServer, getMcpProcessStatus } from './mcp-manager';
import { triggerSync, getSyncState } from './sync';
import { runCompareTest } from './compare-runner';
import { updateTrayMenu, refreshPopup } from './tray';

export function registerIpcHandlers(_mainWindow: BrowserWindow): void {
  // ── Provider handlers ──
  ipcMain.handle('provider:list', () => safeCall(() => providerDb.getAllProviders(), []));
  ipcMain.handle('provider:get', (_e, id: string) => safeCall(() => providerDb.getProviderById(id), null));
  ipcMain.handle('provider:create', (_e, data) => { const r = safeCall(() => providerDb.createProvider(data), null); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); return r; });
  ipcMain.handle('provider:update', (_e, { id, data }) => { const r = safeCall(() => providerDb.updateProvider(id, data), null); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); return r; });
  ipcMain.handle('provider:delete', (_e, id: string) => { safeCall(() => providerDb.deleteProvider(id)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:setActive', (_e, id: string) => { safeCall(() => providerDb.setActiveProvider(id)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:presets', () => PRESET_PROVIDERS);
  ipcMain.handle('provider:toolProviders', () => safeCall(() => providerDb.getToolProviders(), {}));
  ipcMain.handle('provider:setToolProviders', (_e, mapping) => { safeCall(() => providerDb.setToolProviders(mapping)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:toolProviderList', (_e, toolName) => safeCall(() => providerDb.getToolProviderList(toolName), []));
  ipcMain.handle('provider:addToTool', (_e, toolName, providerId) => { safeCall(() => providerDb.addProviderToTool(toolName, providerId)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:removeFromTool', (_e, toolName, providerId) => { safeCall(() => providerDb.removeProviderFromTool(toolName, providerId)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:setToolActive', (_e, toolName, providerId) => { safeCall(() => providerDb.setToolActiveProvider(toolName, providerId)); updateTrayMenu(_mainWindow); refreshPopup(); applyAllToolConfigs(); });
  ipcMain.handle('provider:getToolActive', (_e, toolName) => safeCall(() => providerDb.getToolActiveProviderId(toolName), null));
  ipcMain.handle('provider:toolMapping', () => safeCall(() => providerDb.getProviderToolMapping(), []));
  ipcMain.handle('provider:test', async (_e, id: string) => {
    const provider = providerDb.getProviderById(id);
    if (!provider) return { success: false, error: '供应商不存在' };
    const start = Date.now();
    try {
      const testHeaders: Record<string, string> = {};
      if (provider.apiType === 'google') {
        testHeaders['x-goog-api-key'] = provider.apiKey;
      } else {
        testHeaders['Authorization'] = `Bearer ${provider.apiKey}`;
      }
      const testPath = provider.apiType === 'google' ? `${provider.apiBase}/v1beta/models` : `${provider.apiBase}/models`;
      const res = await fetch(testPath, {
        headers: testHeaders,
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;
      return { success: true, latencyMs, error: undefined };
    } catch (e: any) {
      // Network error — retry bare base URL as fallback
      try {
        await fetch(provider.apiBase, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        return { success: true, latencyMs: Date.now() - start, error: undefined };
      } catch {
        return { success: false, latencyMs: Date.now() - start, error: e.message || '连接失败' };
      }
    }
  });

  /** Fetch system providers from the server API */
  ipcMain.handle('provider:systemList', () => safeCall(async () => {
    const settings = settingDb.getSettings();
    const serverUrl = settings.serverUrl;
    try {
      const res = await fetch(`${serverUrl}/api/system-providers`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const list = await res.json() as any[];
      return list.flatMap((sp) => {
        const type = sp.type === 'custom' ? 'custom' : 'official';
        const entries: any[] = [];
        if (sp.openaiApiBase) {
          entries.push({
            name: sp.name, type, icon: sp.icon || '', apiType: 'openai', apiBase: sp.openaiApiBase, apiKey: '',
            website: sp.website || '',
            cliUrls: Object.fromEntries((API_TYPE_TOOLS.openai || []).map((t: string) => [t, sp.openaiApiBase])),
            headers: {}, models: [],
          });
        }
        if (sp.anthropicApiBase) {
          entries.push({
            name: sp.name, type, icon: sp.icon || '', apiType: 'anthropic', apiBase: sp.anthropicApiBase, apiKey: '',
            website: sp.website || '',
            cliUrls: Object.fromEntries((API_TYPE_TOOLS.anthropic || []).map((t: string) => [t, sp.anthropicApiBase])),
            headers: {}, models: [],
          });
        }
        if (sp.googleApiBase) {
          entries.push({
            name: sp.name, type, icon: sp.icon || '', apiType: 'google', apiBase: sp.googleApiBase, apiKey: '',
            website: sp.website || '',
            cliUrls: Object.fromEntries((API_TYPE_TOOLS.google || []).map((t: string) => [t, sp.googleApiBase])),
            headers: {}, models: [],
          });
        }
        return entries;
      });
    } catch {
      return []; // server unreachable
    }
  }, []));

  // ── Settings handlers ──
  ipcMain.handle('settings:get', () => safeCall(() => settingDb.getSettings(), {}));
  ipcMain.handle('settings:update', (_e, data) => safeCall(() => settingDb.updateSettings(data)));
  ipcMain.handle('settings:updateProxyPort', async (_e, port: number) => {
    const portNum = typeof port === 'number' && port >= 1024 && port <= 65535 ? port : 15721;
    const oldPort = settingDb.getSettings().proxyPort;
    settingDb.updateSettings({ proxyPort: portNum });
    console.log(`[CC Models] Port changed: ${oldPort} → ${portNum}`);
    stopProxy();
    let proxyOk = false;
    try {
      await startProxy();
      proxyOk = true;
    } catch (err: any) {
      console.error('[CC Models] Failed to restart proxy on port', portNum, err.message);
      if (portNum !== 15721) {
        settingDb.updateSettings({ proxyPort: 15721 });
        try {
          await startProxy();
          proxyOk = true;
          console.log('[CC Models] Proxy fallback to port 15721');
        } catch {}
      }
    }
    // Always update all CLI configs, even if proxy restart failed
    console.log('[CC Models] Updating configs for all installed CLI tools...');
    applyAllToolConfigs();
    if (!proxyOk) {
      return { success: false, fallback: true, port: 15721, error: `端口 ${portNum} 被占用，已回退到 15721，但代理启动失败` };
    }
    if (portNum !== settingDb.getSettings().proxyPort) {
      return { success: true, port: 15721, fallback: true, message: `端口 ${portNum} 被占用，已回退到 15721` };
    }
    return { success: true, port: portNum };
  });

  // ── Proxy handlers ──
  ipcMain.handle('proxy:status', () => getProxyStatus());
  ipcMain.handle('failover:status', () => getAllCircuitStatuses());

  // ── Config manager handlers ──
  ipcMain.handle('config:scan', () => safeCall(() => scanCliTools(), []));
  ipcMain.handle('config:apply', (_e, toolName: string) => safeCall(() => applyConfig(toolName), false));
  ipcMain.handle('config:restore', (_e, toolName: string) => safeCall(() => restoreConfig(toolName), false));

  // ── Usage handlers ──
  ipcMain.handle('usage:stats', (_e, filter) => safeCall(() => usageDb.getUsageStats(filter), { totalRequests: 0, totalTokens: 0, totalCost: 0 }));
  ipcMain.handle('usage:daily', (_e, dateFrom, dateTo) => safeCall(() => usageDb.getDailyUsage(dateFrom, dateTo), []));
  ipcMain.handle('usage:byProvider', (_e, dateFrom, dateTo) => safeCall(() => usageDb.getProviderUsage(dateFrom, dateTo), []));
  ipcMain.handle('usage:byModel', (_e, dateFrom, dateTo) => safeCall(() => usageDb.getModelUsage(dateFrom, dateTo), []));

  // ── Session handlers ──
  ipcMain.handle('session:list', (_e, filter) => safeCall(() => sessionDb.listSessions(filter), []));
  ipcMain.handle('session:get', (_e, id) => safeCall(() => sessionDb.getSessionById(id), null));
  ipcMain.handle('session:messages', (_e, sessionId) => safeCall(() => sessionDb.getSessionMessages(sessionId), []));

  // ── Speed test handlers ──
  ipcMain.handle('speedtest:latest', (_e, limit) => safeCall(() => speedTestDb.getLatestSpeedTests(limit), []));
  ipcMain.handle('speedtest:run', () => safeCall(() => { speedTest.runSpeedTests(); }, undefined));
  ipcMain.handle('speedtest:avgLatency', (_e, providerId, days) => safeCall(() => speedTestDb.getProviderAvgLatency(providerId, days), 0));
  ipcMain.handle('speedtest:successRate', (_e, providerId, days) => safeCall(() => speedTestDb.getProviderSuccessRate(providerId, days), 0));

  // ── Budget handlers ──
  ipcMain.handle('budget:status', () => safeCall(() => budgetDb.getBudgetStatus(), { totalCost: 0 }));
  ipcMain.handle('budget:check', () => safeCall(() => budgetDb.checkBudgetThreshold(), false));

  // ── MCP handlers ──
  ipcMain.handle('mcp:list', () => safeCall(() => mcpDb.getAllMcpServers(), []));
  ipcMain.handle('mcp:get', (_e, id) => safeCall(() => mcpDb.getMcpServerById(id), null));
  ipcMain.handle('mcp:create', (_e, data) => safeCall(() => mcpDb.createMcpServer(data), null));
  ipcMain.handle('mcp:update', (_e, id, data) => safeCall(() => mcpDb.updateMcpServer(id, data), null));
  ipcMain.handle('mcp:delete', (_e, id) => safeCall(() => mcpDb.deleteMcpServer(id)));
  ipcMain.handle('mcp:setEnabled', (_e, id, enabled) => safeCall(() => { mcpDb.setMcpEnabled(id, enabled); }));
  ipcMain.handle('mcp:start', (_e, id) => safeCall(() => { const s = mcpDb.getMcpServerById(id); return s ? startMcpServer(s) : false; }, false));
  ipcMain.handle('mcp:stop', (_e, id) => safeCall(() => stopMcpServer(id), false));
  ipcMain.handle('mcp:status', (_e, id) => safeCall(() => getMcpProcessStatus(id), {}));

  // ── Skills handlers ──
  ipcMain.handle('skill:list', () => safeCall(() => skillDb.getAllSkills(), []));
  ipcMain.handle('skill:get', (_e, id) => safeCall(() => skillDb.getSkillById(id), null));
  ipcMain.handle('skill:create', (_e, data) => safeCall(() => skillDb.createSkill(data), null));
  ipcMain.handle('skill:update', (_e, id, data) => safeCall(() => skillDb.updateSkill(id, data), null));
  ipcMain.handle('skill:delete', (_e, id) => safeCall(() => skillDb.deleteSkill(id)));
  ipcMain.handle('skill:setActive', (_e, id, active) => safeCall(() => { skillDb.setSkillActive(id, active); }));
  ipcMain.handle('skill:checkConflict', (_e, name, excludeId) => safeCall(() => skillDb.checkSkillConflict(name, excludeId), null));

  // ── Prompts handlers ──
  ipcMain.handle('prompt:list', () => safeCall(() => promptDb.getAllPrompts(), []));
  ipcMain.handle('prompt:get', (_e, id) => safeCall(() => promptDb.getPromptById(id), null));
  ipcMain.handle('prompt:create', (_e, data) => safeCall(() => promptDb.createPrompt(data), null));
  ipcMain.handle('prompt:update', (_e, id, data) => safeCall(() => promptDb.updatePrompt(id, data), null));
  ipcMain.handle('prompt:delete', (_e, id) => safeCall(() => promptDb.deletePrompt(id)));
  ipcMain.handle('prompt:setActive', (_e, id, active) => safeCall(() => { promptDb.setPromptActive(id, active); }));

  // ── Compare handlers ──
  ipcMain.handle('compare:list', () => safeCall(() => compareDb.getAllCompareTests(), []));
  ipcMain.handle('compare:get', (_e, id) => safeCall(() => compareDb.getCompareTestById(id), null));
  ipcMain.handle('compare:run', (_e, prompt: string, providerIds: string[], modelIds: string[]) => safeCall(() => runCompareTest(prompt, providerIds, modelIds), null));
  ipcMain.handle('compare:updateResponse', (_e, testId, response) => safeCall(() => compareDb.updateCompareResponse(testId, response)));

  // ── Recommendation handlers ──
  ipcMain.handle('recommendation:list', () => safeCall(() => recommendDb.getAllRecommendations(), []));
  ipcMain.handle('recommendation:generate', () => safeCall(() => { recommendDb.generateRecommendations(); return recommendDb.getAllRecommendations(); }, []));

  // ── Sync handlers ──
  ipcMain.handle('sync:status', () => safeCall(() => ({ ...syncQueueDb.getSyncStatus(), ...getSyncState() }), { queueSize: 0 }));
  ipcMain.handle('sync:trigger', () => safeCall(() => triggerSync(), false));

  // ── Shell handlers ──
  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return;
    await shell.openExternal(url);
  });

  // ── Ad handlers (read from server, fall back to local DB) ──
  ipcMain.handle('ad:list', async () => {
    try {
      const list = await fetchAdsFromServer();
      if (list) return list;
    } catch {}
    return safeCall(() => adDb.getAllAds(), []);
  });
  ipcMain.handle('ad:get', (_e, id: string) => safeCall(() => adDb.getAdById(id), null));
  ipcMain.handle('ad:create', (_e, data) => { const r = safeCall(() => adDb.createAd(data), null); refreshPopup(); _mainWindow.webContents.send('ads:changed'); return r; });
  ipcMain.handle('ad:update', (_e, id: string, data) => { const r = safeCall(() => adDb.updateAd(id, data), null); refreshPopup(); _mainWindow.webContents.send('ads:changed'); return r; });
  ipcMain.handle('ad:delete', (_e, id: string) => { safeCall(() => adDb.deleteAd(id)); refreshPopup(); _mainWindow.webContents.send('ads:changed'); });
  ipcMain.handle('ad:byType', async (_e, type: string) => {
    try {
      const list = await fetchAdsFromServer();
      if (list) return list.filter((a) => a.type === type);
    } catch {}
    return safeCall(() => adDb.getAdsByType(type), []);
  });

  // ── Window control handlers ──
  ipcMain.handle('window:minimize', () => {
    _mainWindow?.minimize();
  });
  ipcMain.handle('window:close', () => {
    _mainWindow?.hide();
  });

  // ── System settings & update check ──
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('system-settings:get', () => safeCall(async () => {
    const settings = settingDb.getSettings();
    const serverUrl = settings.serverUrl;
    if (!serverUrl) return { websiteUrl: 'https://cc-models.app', latestVersion: '', downloadUrl: '' };
    const res = await fetch(`${serverUrl}/api/system-settings`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) return res.json();
    return { websiteUrl: 'https://cc-models.app', latestVersion: '', downloadUrl: '' };
  }, { websiteUrl: 'https://cc-models.app', latestVersion: '', downloadUrl: '' }));

  ipcMain.handle('update:check', () => safeCall(async () => {
    const currentVersion = app.getVersion();
    const settings = settingDb.getSettings();
    const serverUrl = settings.serverUrl;
    if (!serverUrl) return { hasUpdate: false, latestVersion: '', downloadUrl: '', currentVersion, error: '未配置服务器地址' };
    const res = await fetch(`${serverUrl}/api/system-settings`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { hasUpdate: false, latestVersion: '', downloadUrl: '', currentVersion, error: '服务器不可达' };
    const data = await res.json() as any;
    const latestVersion = (data.latestVersion || '').trim();
    const downloadUrl = (data.downloadUrl || '').trim();
    if (!latestVersion) return { hasUpdate: false, latestVersion: '', downloadUrl: '', currentVersion, error: '' };
    // Compare versions: different or newer
    const hasUpdate = latestVersion !== currentVersion;
    return { hasUpdate, latestVersion, downloadUrl, currentVersion, error: '' };
  }, { hasUpdate: false, latestVersion: '', downloadUrl: '', currentVersion: '', error: '检查失败' }));
}

function safeCall<T>(fn: () => T, fallback: any = undefined): T {
  try { return fn(); } catch (e: any) {
    console.error('[IPC]', e.message);
    return fallback as T;
  }
}

function normalizeServerAd(item: any): import('./database/ads').AdRecord {
  return {
    id: item.id,
    type: item.type as import('./database/ads').AdRecord['type'],
    title: item.title ?? '',
    htmlContent: item.htmlContent ?? '',
    textContent: item.textContent ?? '',
    linkUrl: item.linkUrl ?? '',
    width: item.width ?? 0,
    height: item.height ?? 0,
    enabled: item.enabled === 1 || item.enabled === true,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
  };
}

async function fetchAdsFromServer(): Promise<import('./database/ads').AdRecord[] | null> {
  const settings = settingDb.getSettings();
  const serverUrl = settings.serverUrl;
  try {
    const res = await fetch(`${serverUrl}/api/ad/list`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json() as any[];
      return data.map((item: any) => normalizeServerAd(item));
    }
  } catch {}
  return null;
}
