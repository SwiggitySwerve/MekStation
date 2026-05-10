import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { IUpdateAvailableInfo } from './main.config';

interface IAutoUpdaterContext {
  readonly checkForUpdates: () => Promise<void>;
  readonly notifyUpdateAvailable: (info: IUpdateAvailableInfo) => Promise<void>;
  readonly notifyUpdateError: (error: unknown) => void;
  readonly notifyUpdateReady: () => Promise<void>;
  readonly resetProgressBar: () => void;
  readonly updateCheckIntervalMs: number;
  readonly updateDownloadProgress: (percent: number) => void;
}

export function initializeAutoUpdater({
  checkForUpdates,
  notifyUpdateAvailable,
  notifyUpdateError,
  notifyUpdateReady,
  resetProgressBar,
  updateCheckIntervalMs,
  updateDownloadProgress,
}: IAutoUpdaterContext): void {
  const updateChannel = process.env.MEKSTATION_UPDATE_CHANNEL || 'latest';
  const updateFeedBaseUrl =
    process.env.MEKSTATION_UPDATE_FEED_BASE_URL ||
    'https://swiggityswerve.github.io/MekStation/updates';

  autoUpdater.disableDifferentialDownload = true;
  autoUpdater.channel = updateChannel;
  autoUpdater.allowDowngrade = false;
  autoUpdater.autoDownload = false;

  const normalizedBaseUrl = updateFeedBaseUrl.replace(/\/+$/, '');
  const platformFeedUrl =
    process.platform === 'win32'
      ? `${normalizedBaseUrl}/win`
      : process.platform === 'linux'
        ? `${normalizedBaseUrl}/linux`
        : process.platform === 'darwin'
          ? `${normalizedBaseUrl}/mac/${process.arch === 'arm64' ? 'arm64' : 'x64'}`
          : normalizedBaseUrl;

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: platformFeedUrl,
    channel: updateChannel,
  });

  console.log(
    `Auto-updater initialized | version=${app.getVersion()} | channel=${updateChannel} | platform=${process.platform} | arch=${process.arch} | feed=${platformFeedUrl}`,
  );

  void checkForUpdates();

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    void notifyUpdateAvailable(info);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date');
    resetProgressBar();
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    resetProgressBar();
    notifyUpdateError(err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(message);
    updateDownloadProgress(progressObj.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    resetProgressBar();
    void notifyUpdateReady();
  });

  setInterval(() => {
    void checkForUpdates();
  }, updateCheckIntervalMs);
}
