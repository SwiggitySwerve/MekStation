import { BackupService } from '../services/local/BackupService';
import { LocalStorageService } from '../services/local/LocalStorageService';
import { RecentFilesService } from '../services/local/RecentFilesService';
import { SettingsService } from '../services/local/SettingsService';

interface ICleanupServicesContext {
  readonly backupService: BackupService | null;
  readonly localStorage: LocalStorageService | null;
  readonly recentFilesService: RecentFilesService | null;
  readonly sendToRenderer: (
    channel: string,
    ...args: unknown[]
  ) => Promise<void>;
  readonly settingsService: SettingsService | null;
}

export async function cleanupServices({
  backupService,
  localStorage,
  recentFilesService,
  sendToRenderer,
  settingsService,
}: ICleanupServicesContext): Promise<void> {
  console.log('Cleaning up application...');

  try {
    await sendToRenderer('save-all-data');
    await recentFilesService?.cleanup();
    await settingsService?.cleanup();
    await backupService?.cleanup();
    await localStorage?.cleanup();

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}
