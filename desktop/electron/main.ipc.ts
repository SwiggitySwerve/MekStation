import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

import { LocalStorageService } from '../services/local/LocalStorageService';
import {
  IAddRecentFileParams,
  RecentFilesService,
} from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import {
  APP_IPC_CHANNELS,
  IDesktopSettings,
  MENU_IPC_CHANNELS,
  RECENT_FILES_IPC_CHANNELS,
  SETTINGS_IPC_CHANNELS,
} from '../types/BaseTypes';
import { MenuManager } from './MenuManager';
import {
  PATH_OUTSIDE_SANDBOX_ERROR,
  resolveWithinSandbox,
} from './pathSandbox';

interface IMainIpcContext {
  readonly checkForUpdates: () => Promise<void>;
  readonly createBackup: () => Promise<boolean>;
  readonly developmentMode: boolean;
  readonly getLocalStorage: () => LocalStorageService | null;
  readonly getMainWindow: () => BrowserWindow | null;
  readonly getMenuManager: () => MenuManager | null;
  readonly getRecentFilesService: () => RecentFilesService | null;
  readonly getSettingsService: () => SettingsService | null;
  readonly restoreBackup: (backupPath: string) => Promise<boolean>;
  readonly userDataPath: string;
}

export function setupIpcHandlers({
  checkForUpdates,
  createBackup,
  developmentMode,
  getLocalStorage,
  getMainWindow,
  getMenuManager,
  getRecentFilesService,
  getSettingsService,
  restoreBackup,
  userDataPath,
}: IMainIpcContext): void {
  console.log('Setting up IPC handlers...');

  const getDataRoots = (): readonly string[] => [
    path.join(userDataPath, 'data'),
    getBackupRoot(),
  ];
  const getBackupRoots = (): readonly string[] => [getBackupRoot()];
  const getBackupRoot = (): string => {
    const backupDirectory = getSettingsService()?.getAll().backupDirectory;
    return backupDirectory && backupDirectory.trim().length > 0
      ? backupDirectory
      : path.join(userDataPath, 'backups');
  };

  ipcMain.handle(SETTINGS_IPC_CHANNELS.GET, () => {
    return getSettingsService()?.getAll() ?? null;
  });

  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.SET,
    async (_event, updates: Partial<IDesktopSettings>) => {
      const settingsService = getSettingsService();
      if (!settingsService) {
        return { success: false, error: 'Settings service not initialized' };
      }
      return await settingsService.setMultiple(updates);
    },
  );

  ipcMain.handle(SETTINGS_IPC_CHANNELS.RESET, async () => {
    const settingsService = getSettingsService();
    if (!settingsService) {
      return { success: false, error: 'Settings service not initialized' };
    }
    return await settingsService.reset();
  });

  ipcMain.handle(
    SETTINGS_IPC_CHANNELS.GET_VALUE,
    (_event, key: keyof IDesktopSettings) => {
      return getSettingsService()?.get(key) ?? null;
    },
  );

  ipcMain.handle(RECENT_FILES_IPC_CHANNELS.LIST, () => {
    return getRecentFilesService()?.list() ?? [];
  });

  ipcMain.handle(
    RECENT_FILES_IPC_CHANNELS.ADD,
    async (_event, params: IAddRecentFileParams) => {
      const recentFilesService = getRecentFilesService();
      if (!recentFilesService) {
        return {
          success: false,
          error: 'Recent files service not initialized',
        };
      }
      return await recentFilesService.add(params);
    },
  );

  ipcMain.handle(
    RECENT_FILES_IPC_CHANNELS.REMOVE,
    async (_event, id: string) => {
      const recentFilesService = getRecentFilesService();
      if (!recentFilesService) {
        return {
          success: false,
          error: 'Recent files service not initialized',
        };
      }
      return await recentFilesService.remove(id);
    },
  );

  ipcMain.handle(RECENT_FILES_IPC_CHANNELS.CLEAR, async () => {
    const recentFilesService = getRecentFilesService();
    if (!recentFilesService) {
      return {
        success: false,
        error: 'Recent files service not initialized',
      };
    }
    return await recentFilesService.clear();
  });

  ipcMain.handle(
    MENU_IPC_CHANNELS.UPDATE_STATE,
    (
      _event,
      state: {
        canRedo?: boolean;
        canUndo?: boolean;
        hasSelection?: boolean;
        hasUnit?: boolean;
      },
    ) => {
      getMenuManager()?.updateMenuState(state);
    },
  );

  ipcMain.handle(
    'save-file',
    async (_event, defaultPath: string, filters: Electron.FileFilter[]) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return { canceled: true };
      return await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters,
      });
    },
  );

  ipcMain.handle(
    'open-file',
    async (_event, filters: Electron.FileFilter[]) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return { canceled: true, filePaths: [] };
      return await dialog.showOpenDialog(mainWindow, {
        filters,
        properties: ['openFile'],
      });
    },
  );

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      const safePath = await resolveWithinSandbox(filePath, getDataRoots(), {
        targetMustExist: true,
      });
      const data = await fs.readFile(safePath, 'utf-8');
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  });

  ipcMain.handle(
    'write-file',
    async (_event, filePath: string, data: string) => {
      try {
        const safePath = await resolveWithinSandbox(filePath, getDataRoots());
        await fs.writeFile(safePath, data, 'utf-8');
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to write file',
        };
      }
    },
  );

  ipcMain.handle('select-directory', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
  });

  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    userDataPath,
    developmentMode,
  }));

  ipcMain.handle('minimize-window', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('close-window', () => {
    getMainWindow()?.close();
  });

  ipcMain.handle('service-call', async (_event, method: string) => {
    try {
      switch (method) {
        case 'checkForUpdates':
          await checkForUpdates();
          return { success: true };
        case 'clearCache':
          await getLocalStorage()?.clear();
          return { success: true };
        default:
          return { success: false, error: `Unknown method: ${method}` };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  ipcMain.handle('create-backup', async () => {
    return await createBackup();
  });

  ipcMain.handle('restore-backup', async (_event, backupPath: string) => {
    try {
      const safePath = await resolveWithinSandbox(
        backupPath,
        getBackupRoots(),
        {
          targetMustExist: true,
        },
      );
      return await restoreBackup(safePath);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === PATH_OUTSIDE_SANDBOX_ERROR
      ) {
        return false;
      }
      return false;
    }
  });

  console.log('IPC handlers setup complete');
}
