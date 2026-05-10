import { BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

import { BackupService } from '../services/local/BackupService';
import { IUpdateAvailableInfo } from './main.config';

export async function importUnitFile(
  mainWindow: BrowserWindow | null,
  sendToRenderer: (channel: string, ...args: unknown[]) => Promise<void>,
): Promise<void> {
  try {
    if (!mainWindow) return;
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'MegaMek Files', extensions: ['mtf'] },
        { name: 'MekStation Files', extensions: ['bte', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      await sendToRenderer('import-unit-file', result.filePaths[0]);
    }
  } catch (error) {
    console.error('Unit import failed:', error);
  }
}

export async function createBackup(
  backupService: BackupService | null,
): Promise<boolean> {
  try {
    if (!backupService) return false;
    const backupPath = await backupService.createBackup();
    console.log('Backup created:', backupPath);
    return true;
  } catch (error) {
    console.error('Backup creation failed:', error);
    return false;
  }
}

export async function restoreBackup(
  backupService: BackupService | null,
  backupPath: string,
): Promise<boolean> {
  try {
    if (!backupService) return false;
    await backupService.restoreBackup(backupPath);
    console.log('Backup restored:', backupPath);
    return true;
  } catch (error) {
    console.error('Backup restoration failed:', error);
    return false;
  }
}

export async function notifyUpdateAvailable(
  mainWindow: BrowserWindow | null,
  info: IUpdateAvailableInfo,
  updateDownloadProgress: (percent: number) => void,
): Promise<void> {
  if (!mainWindow) return;
  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available. Would you like to download it now?`,
    buttons: ['Download', 'Later'],
    defaultId: 0,
  });

  if (choice.response === 0) {
    updateDownloadProgress(0);
    autoUpdater.downloadUpdate();
  }
}

export function updateDownloadProgress(
  mainWindow: BrowserWindow | null,
  percent: number,
): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(percent / 100);
  }
}

export function resetProgressBar(mainWindow: BrowserWindow | null): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1);
  }
}

export function notifyUpdateError(
  mainWindow: BrowserWindow | null,
  error: unknown,
): void {
  if (!mainWindow) return;
  const message =
    error instanceof Error
      ? error.message
      : 'Unknown error occurred while checking for updates.';
  dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: 'Update Failed',
    message: 'Failed to check for or download updates.',
    detail: message,
    buttons: ['OK'],
  });
}

export async function notifyUpdateReady(
  mainWindow: BrowserWindow | null,
): Promise<void> {
  if (!mainWindow) return;
  const choice = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message:
      'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
  });

  if (choice.response === 0) {
    autoUpdater.quitAndInstall();
  }
}
