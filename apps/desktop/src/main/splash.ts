import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let splashWindow: BrowserWindow | null = null;

export function createSplashWindow(): void {
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, 'splash.png')
    : path.join(__dirname, '../../resources/splash.png');

  // Verify file exists, otherwise skip splash
  if (!fs.existsSync(splashPath)) {
    console.error('[CC Models] Splash image not found:', splashPath);
    return;
  }

  splashWindow = new BrowserWindow({
    width: 560,
    height: 560,
    frame: false,
    resizable: false,
    show: false,
    center: true,
    alwaysOnTop: true,
    transparent: true,
  });

  splashWindow.loadFile(splashPath);
  splashWindow.once('ready-to-show', () => splashWindow?.show());
}

export function closeSplashWindow(): void {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}
