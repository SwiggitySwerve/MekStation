import * as path from 'path';

import { BackupService } from '../services/local/BackupService';
import { LocalStorageService } from '../services/local/LocalStorageService';
import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';
import { IDesktopSettings } from '../types/BaseTypes';
import { IDesktopAppConfig } from './main.config';

interface IInitializeServicesContext {
  readonly config: IDesktopAppConfig;
  readonly onRecentFilesUpdate: () => void;
  readonly onSettingsChange: (event: {
    key: keyof IDesktopSettings;
    oldValue: unknown;
    newValue: unknown;
  }) => void;
  readonly userDataPath: string;
}

interface IDesktopServices {
  readonly backupService: BackupService | null;
  readonly localStorage: LocalStorageService;
  readonly recentFilesService: RecentFilesService;
  readonly settingsService: SettingsService;
}

export async function initializeDesktopServices({
  config,
  onRecentFilesUpdate,
  onSettingsChange,
  userDataPath,
}: IInitializeServicesContext): Promise<IDesktopServices> {
  console.log('Initializing services...');

  const localStorage = new LocalStorageService({
    dataPath: path.join(userDataPath, 'data'),
    enableCompression: true,
    enableEncryption: false,
    maxFileSize: 10 * 1024 * 1024,
  });
  await localStorage.initialize();

  const settingsService = new SettingsService({ localStorage });
  await settingsService.initialize();
  settingsService.on('change', onSettingsChange);

  const recentFilesService = new RecentFilesService({
    localStorage,
    maxRecentFiles: settingsService.get('maxRecentFiles'),
  });
  await recentFilesService.initialize();
  recentFilesService.on('update', onRecentFilesUpdate);

  const backupService = config.enableBackups
    ? await createBackupService(userDataPath, settingsService)
    : null;

  console.log('Services initialized successfully');

  return {
    backupService,
    localStorage,
    recentFilesService,
    settingsService,
  };
}

async function createBackupService(
  userDataPath: string,
  settingsService: SettingsService,
): Promise<BackupService> {
  const settings = settingsService.getAll();
  const backupService = new BackupService({
    dataPath: path.join(userDataPath, 'data'),
    backupPath: settings.backupDirectory || path.join(userDataPath, 'backups'),
    maxBackups: settings.maxBackupCount,
    compressionLevel: 6,
  });

  await backupService.initialize();
  return backupService;
}
