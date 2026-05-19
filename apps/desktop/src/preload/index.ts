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
});
