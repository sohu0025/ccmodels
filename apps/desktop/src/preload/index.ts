import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getProviders: () => ipcRenderer.invoke('provider:list'),
  getProvider: (id: string) => ipcRenderer.invoke('provider:get', id),
  createProvider: (data: unknown) => ipcRenderer.invoke('provider:create', data),
  updateProvider: (id: string, data: unknown) => ipcRenderer.invoke('provider:update', { id, data }),
  deleteProvider: (id: string) => ipcRenderer.invoke('provider:delete', id),
  setActiveProvider: (id: string) => ipcRenderer.invoke('provider:setActive', id),
  getPresetProviders: () => ipcRenderer.invoke('provider:presets'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: unknown) => ipcRenderer.invoke('settings:update', data),
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
  runCompareTest: (prompt: string, models: string[]) => ipcRenderer.invoke('compare:run', prompt, models),
  updateCompareResponse: (testId: string, response: any) => ipcRenderer.invoke('compare:updateResponse', testId, response),

  // Recommendations
  listRecommendations: () => ipcRenderer.invoke('recommendation:list'),
  generateRecommendations: () => ipcRenderer.invoke('recommendation:generate'),
});
