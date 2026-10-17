import { app, BrowserWindow } from 'electron';

import { stopEmbeddedServer } from './main.server';

const CLEANUP_TIMEOUT_MS = 10_000;

interface IAppEventContext {
  readonly cleanup: () => Promise<void>;
  readonly createMainWindow: () => Promise<void>;
  readonly getMainWindow: () => BrowserWindow | null;
}

export function registerAppEvents({
  cleanup,
  createMainWindow,
  getMainWindow,
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

  // Electron does not await async before-quit handlers, so hold the quit,
  // finish cleanup (bounded), then quit for real. Cancelling will-quit while
  // cleanup ran used to abort the quit and leave the app + server running.
  let cleanupState: 'idle' | 'running' | 'done' = 'idle';
  app.on('before-quit', (event: Electron.Event) => {
    if (cleanupState === 'done') return;
    event.preventDefault();
    if (cleanupState === 'running') return;
    cleanupState = 'running';
    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, CLEANUP_TIMEOUT_MS).unref?.(),
    );
    void Promise.race([cleanup(), timeout])
      .catch((error: unknown) => console.error('Cleanup failed:', error))
      .finally(() => {
        cleanupState = 'done';
        app.quit();
      });
  });

  // Last line of defence: never leave the embedded server orphaned.
  app.on('will-quit', () => {
    stopEmbeddedServer();
  });
}
