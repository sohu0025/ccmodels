import { BrowserWindow, app, nativeImage } from 'electron';
import path from 'node:path';
import { DEFAULT_DEV_SERVER_PORT } from '@ccmodels/shared';

const isDev = !app.isPackaged;

export function createMainWindow(onReady?: () => void): BrowserWindow {

  // Set window icon from resources
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  const win = new BrowserWindow({
    width: 850,
    height: 535,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'CC Models',
    icon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  win.once('ready-to-show', () => {
    console.log('[CC Models] Window ready-to-show, showing now');
    win.show();
    onReady?.();
  });

  win.on('maximize', () => win.unmaximize());

  if (isDev) {
    win.loadURL(`http://localhost:${DEFAULT_DEV_SERVER_PORT}`);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}
