import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getProviders: () => ipcRenderer.invoke('provider:list'),
  getProvider: (id: string) => ipcRenderer.invoke('provider:get', id),
  createProvider: (data: unknown) => ipcRenderer.invoke('provider:create', data),
  updateProvider: (id: string, data: unknown) => ipcRenderer.invoke('provider:update', { id, data }),
  deleteProvider: (id: string) => ipcRenderer.invoke('provider:delete', id),
  setActiveProvider: (id: string) => ipcRenderer.invoke('provider:setActive', id),
  getPresetProviders: () => ipcRenderer.invoke('provider:presets'),
  getToolProviders: () => ipcRenderer.invoke('provider:toolProviders'),
  setToolProviders: (mapping: Record<string, string>) => ipcRenderer.invoke('provider:setToolProviders', mapping),
  getToolProviderList: (toolName: string) => ipcRenderer.invoke('provider:toolProviderList', toolName),
  addProviderToTool: (toolName: string, providerId: string) => ipcRenderer.invoke('provider:addToTool', toolName, providerId),
  removeProviderFromTool: (toolName: string, providerId: string) => ipcRenderer.invoke('provider:removeFromTool', toolName, providerId),
  setToolActiveProvider: (toolName: string, providerId: string) => ipcRenderer.invoke('provider:setToolActive', toolName, providerId),
  getToolActiveProvider: (toolName: string) => ipcRenderer.invoke('provider:getToolActive', toolName),
  testProvider: (id: string) => ipcRenderer.invoke('provider:test', id),
  getSystemProviders: () => ipcRenderer.invoke('provider:systemList'),
  getProviderToolMapping: () => ipcRenderer.invoke('provider:toolMapping'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: unknown) => ipcRenderer.invoke('settings:update', data),
  updateProxyPort: (port: number) => ipcRenderer.invoke('settings:updateProxyPort', port),
  getProxyStatus: () => ipcRenderer.invoke('proxy:status'),
  getFailoverStatus: () => ipcRenderer.invoke('failover:status'),
  scanCliTools: () => ipcRenderer.invoke('config:scan'),
  applyConfig: (toolName: string) => ipcRenderer.invoke('config:apply', toolName),
  restoreConfig: (toolName: string) => ipcRenderer.invoke('config:restore', toolName),

  // Usage
  getUsageStats: (filter: any) => ipcRenderer.invoke('usage:stats', filter),
  getDailyUsage: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:daily', dateFrom, dateTo),
  getUsageByProvider: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:byProvider', dateFrom, dateTo),
  getUsageByModel: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:byModel', dateFrom, dateTo),

  // Sessions
  listSessions: (filter: any) => ipcRenderer.invoke('session:list', filter),
  getSession: (id: string) => ipcRenderer.invoke('session:get', id),
  getSessionMessages: (sessionId: string) => ipcRenderer.invoke('session:messages', sessionId),

  // Speed tests
  getLatestSpeedTests: (limit?: number) => ipcRenderer.invoke('speedtest:latest', limit),
  runSpeedTest: () => ipcRenderer.invoke('speedtest:run'),
  getProviderAvgLatency: (providerId: string, days?: number) => ipcRenderer.invoke('speedtest:avgLatency', providerId, days),
  getProviderSuccessRate: (providerId: string, days?: number) => ipcRenderer.invoke('speedtest:successRate', providerId, days),

  // Budget
  getBudgetStatus: () => ipcRenderer.invoke('budget:status'),
  checkBudget: () => ipcRenderer.invoke('budget:check'),

  // MCP
  listMcpServers: () => ipcRenderer.invoke('mcp:list'),
  getMcpServer: (id: string) => ipcRenderer.invoke('mcp:get', id),
  createMcpServer: (data: any) => ipcRenderer.invoke('mcp:create', data),
  updateMcpServer: (id: string, data: any) => ipcRenderer.invoke('mcp:update', id, data),
  deleteMcpServer: (id: string) => ipcRenderer.invoke('mcp:delete', id),
  setMcpEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('mcp:setEnabled', id, enabled),
  startMcpServer: (id: string) => ipcRenderer.invoke('mcp:start', id),
  stopMcpServer: (id: string) => ipcRenderer.invoke('mcp:stop', id),
  getMcpStatus: (id: string) => ipcRenderer.invoke('mcp:status', id),

  // Skills
  listSkills: () => ipcRenderer.invoke('skill:list'),
  getSkill: (id: string) => ipcRenderer.invoke('skill:get', id),
  createSkill: (data: any) => ipcRenderer.invoke('skill:create', data),
  updateSkill: (id: string, data: any) => ipcRenderer.invoke('skill:update', id, data),
  deleteSkill: (id: string) => ipcRenderer.invoke('skill:delete', id),
  setSkillActive: (id: string, active: boolean) => ipcRenderer.invoke('skill:setActive', id, active),
  checkSkillConflict: (name: string, excludeId?: string) => ipcRenderer.invoke('skill:checkConflict', name, excludeId),

  // Prompts
  listPrompts: () => ipcRenderer.invoke('prompt:list'),
  getPrompt: (id: string) => ipcRenderer.invoke('prompt:get', id),
  createPrompt: (data: any) => ipcRenderer.invoke('prompt:create', data),
  updatePrompt: (id: string, data: any) => ipcRenderer.invoke('prompt:update', id, data),
  deletePrompt: (id: string) => ipcRenderer.invoke('prompt:delete', id),
  setPromptActive: (id: string, active: boolean) => ipcRenderer.invoke('prompt:setActive', id, active),

  // Sync
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),

  // Compare
  listCompareTests: () => ipcRenderer.invoke('compare:list'),
  getCompareTest: (id: string) => ipcRenderer.invoke('compare:get', id),
  runCompareTest: (prompt: string, providerIds: string[], modelIds: string[]) => ipcRenderer.invoke('compare:run', prompt, providerIds, modelIds),
  updateCompareResponse: (testId: string, response: any) => ipcRenderer.invoke('compare:updateResponse', testId, response),

  // Recommendations
  listRecommendations: () => ipcRenderer.invoke('recommendation:list'),
  generateRecommendations: () => ipcRenderer.invoke('recommendation:generate'),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // System settings & update
  getSystemSettings: () => ipcRenderer.invoke('system-settings:get'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Ads (read-only from desktop)
  listAds: () => ipcRenderer.invoke('ad:list'),
  getAd: (id: string) => ipcRenderer.invoke('ad:get', id),
  getAdsByType: (type: string) => ipcRenderer.invoke('ad:byType', type),

  // Push notifications from main process
  onToolActiveChanged: (callback: (data: { tool: string; providerId: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('provider:toolActiveChanged', handler);
    return () => ipcRenderer.removeListener('provider:toolActiveChanged', handler);
  },
  onAdsChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('ads:changed', handler);
    return () => ipcRenderer.removeListener('ads:changed', handler);
  },
  onSystemProvidersChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('systemProviders:changed', handler);
    return () => ipcRenderer.removeListener('systemProviders:changed', handler);
  },
});
