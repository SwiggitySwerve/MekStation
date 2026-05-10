import { app, BrowserWindow } from 'electron';

interface IAppEventContext {
  readonly cleanup: () => Promise<void>;
  readonly createMainWindow: () => Promise<void>;
  readonly getMainWindow: () => BrowserWindow | null;
  readonly isCleaningUp: () => boolean;
}

export function registerAppEvents({
  cleanup,
  createMainWindow,
  getMainWindow,
  isCleaningUp,
}: IAppEventContext): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });

  app.on('before-quit', async () => {
    await cleanup();
  });

  app.on('will-quit', (event) => {
    if (isCleaningUp()) {
      event.preventDefault();
    }
  });
}
