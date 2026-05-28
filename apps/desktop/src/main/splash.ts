import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let splashWindow: BrowserWindow | null = null;

export function createSplashWindow(): void {
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, 'splash.png')
    : path.join(__dirname, '../../assets/splash.png');

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

  const fileUrl = `file://${splashPath.replace(/\\/g, '/')}`;
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; }
  body { display:flex; align-items:center; justify-content:center; background:transparent; }
  img { width:100%; height:100%; object-fit:contain; -webkit-user-drag:none; }
</style>
</head>
<body><img src="${fileUrl}"></body>
</html>`;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  splashWindow.once('ready-to-show', () => splashWindow?.show());
}

export function closeSplashWindow(): void {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}
