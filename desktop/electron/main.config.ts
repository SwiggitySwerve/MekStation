import * as path from 'path';

export interface IDesktopAppConfig {
  readonly autoSaveInterval: number;
  readonly backupInterval: number;
  readonly developmentMode: boolean;
  readonly enableAutoUpdater: boolean;
  readonly enableBackups: boolean;
  readonly enableSystemTray: boolean;
  readonly updateCheckIntervalMs: number;
  readonly windowBounds: {
    height: number;
    minHeight: number;
    minWidth: number;
    width: number;
  };
}

export interface IUpdateAvailableInfo {
  readonly version: string;
}

export function createDesktopAppConfig(): IDesktopAppConfig {
  const envIntervalMinutes = Number.parseInt(
    process.env.MEKSTATION_UPDATE_INTERVAL_MINUTES ?? '',
    10,
  );
  const isValidInterval =
    Number.isFinite(envIntervalMinutes) && envIntervalMinutes > 0;

  return {
    enableAutoUpdater: !process.env.NODE_ENV?.includes('dev'),
    enableSystemTray: true,
    enableBackups: true,
    autoSaveInterval: 30000,
    backupInterval: 300000,
    updateCheckIntervalMs:
      (isValidInterval ? envIntervalMinutes : 60) * 60 * 1000,
    windowBounds: {
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 768,
    },
    developmentMode: process.env.NODE_ENV === 'development',
  };
}

export function getAppIcon(baseDir: string): string {
  const iconName =
    process.platform === 'win32'
      ? 'icon.ico'
      : process.platform === 'darwin'
        ? 'icon.icns'
        : 'icon.png';
  return path.join(baseDir, '../assets/icons', iconName);
}

export function getTrayIcon(baseDir: string): string {
  const iconName =
    process.platform === 'win32'
      ? 'tray.ico'
      : process.platform === 'darwin'
        ? 'tray.png'
        : 'tray.png';
  return path.join(baseDir, '../assets/icons', iconName);
}
