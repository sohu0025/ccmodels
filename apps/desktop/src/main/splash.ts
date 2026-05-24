import { BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let splashWindow: BrowserWindow | null = null;

export function createSplashWindow(): void {
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, 'splash.png')
    : path.join(__dirname, '../../resources/splash.png');

  let html = '<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#1a1a2e;overflow:hidden">';
  try {
    const imageData = fs.readFileSync(splashPath).toString('base64');
    html += `<img src="data:image/png;base64,${imageData}" style="max-width:100%;max-height:100%;object-fit:contain">`;
  } catch {
    html += '<div style="color:#fff;font-size:18px">Loading...</div>';
  }
  html += '</body></html>';

  splashWindow = new BrowserWindow({
    width: 560,
    height: 560,
    frame: false,
    resizable: false,
    show: false,
    center: true,
    alwaysOnTop: true,
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  splashWindow.once('ready-to-show', () => splashWindow?.show());
}

export function closeSplashWindow(): void {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}
