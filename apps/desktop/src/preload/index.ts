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
});
