import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('trayPopup', {
  action: (action: string, payload?: unknown) => ipcRenderer.invoke('tray:action', action, payload),
  resize: (width: number, height: number) => ipcRenderer.invoke('tray:resize', width, height),
});
