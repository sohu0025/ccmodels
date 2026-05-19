import { Tray, Menu, nativeImage, BrowserWindow, Notification, app } from 'electron';
import type { NativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getActiveProvider } from './database/providers';
import { getSettings, updateSettings } from './database/settings';

let tray: Tray | null = null;

function getIcon(): NativeImage {
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }
  // Fallback: 16x16 blue circle PNG data URL
  return nativeImage
    .createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAK5JREFUOE9jZACC/xQwpg1A/MeVz/j/GGmBzJMJYgWYWTT2jynOoQE2OgH4pwIDMJA//mCgBo3BhHwI1HXAAIX6PGAZqNVYPq3egBI6DIkglzEgAA1FHphBQjoNpUAJCAZQFCSUDFTVVJIgkQKJBiANQmmsFBQfgIygRBoBkqhSUpHINAYDAxqCLLPgAjAZu3AeKcHGBwZgYGBg8Y0YZYE4tSAIMjPAAwMDA4C4oSNNAABifxwiCF0IYQAAAABJRU5ErkJggg==',
    )
    .resize({ width: 16, height: 16 });
}

export function initTray(mainWindow: BrowserWindow): void {
  const icon = getIcon();
  tray = new Tray(icon);
  tray.setToolTip('CC Switch');
  updateTrayMenu(mainWindow);
}

export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const activeProvider = getActiveProvider();
  const providerLabel = activeProvider
    ? `${activeProvider.name} — Current`
    : 'No provider selected';

  const settings = getSettings();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: providerLabel,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Panel',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Lightweight Mode',
      type: 'checkbox',
      checked: settings.lightweightMode,
      click: () => {
        const current = getSettings();
        const newValue = !current.lightweightMode;
        updateSettings({ lightweightMode: newValue });
        if (newValue) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
        updateTrayMenu(mainWindow);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}
