import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';

let mainWindow: BrowserWindow | null = null;

async function bootstrap() {
  await app.whenReady();
  mainWindow = createMainWindow();
}

app.on('window-all-closed', () => {
  // Keep running in tray - don't quit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

bootstrap();
