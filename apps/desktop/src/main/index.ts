import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';
import { registerIpcHandlers } from './ipc-handlers';
import { initDatabase, closeDatabase } from './database';

let mainWindow: BrowserWindow | null = null;

app.on('will-quit', () => {
  closeDatabase();
});

async function bootstrap() {
  await app.whenReady();
  mainWindow = createMainWindow();
  initDatabase();
  registerIpcHandlers(mainWindow);
}

app.on('window-all-closed', () => {
  // Keep running in tray - don't quit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
    if (mainWindow) {
      registerIpcHandlers(mainWindow);
    }
  }
});

bootstrap();
