import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available.`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to install?',
      buttons: ['Restart', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[CC Switch] Auto-update error:', err.message);
  });

  // Check for updates (in production only)
  if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
    autoUpdater.checkForUpdates().catch(() => {});
  }
}
