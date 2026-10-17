import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { IUpdateAvailableInfo } from './main.config';

export const RELEASES_PAGE_URL =
  'https://github.com/SwiggitySwerve/MekStation/releases/latest';

interface IAutoUpdaterContext {
  readonly notifyUpdateAvailable: (info: IUpdateAvailableInfo) => Promise<void>;
  readonly notifyUpdateReady: () => Promise<void>;
  readonly resetProgressBar: () => void;
  readonly updateCheckIntervalMs: number;
  readonly updateDownloadProgress: (percent: number) => void;
}

/**
 * Unsigned macOS builds cannot be installed by Squirrel.Mac and the release's
 * per-arch latest-mac-<arch>.yml is not what the mac updater requests, so
 * macOS updates stay manual (Check for Updates opens the releases page).
 */
export function isAutoUpdateSupported(): boolean {
  return process.platform !== 'darwin';
}

export function initializeAutoUpdater({
  notifyUpdateAvailable,
  notifyUpdateReady,
  resetProgressBar,
  updateCheckIntervalMs,
  updateDownloadProgress,
}: IAutoUpdaterContext): void {
  if (!isAutoUpdateSupported()) {
    autoUpdater.autoInstallOnAppQuit = false;
    console.log(`Auto-updater disabled on macOS; see ${RELEASES_PAGE_URL}`);
    return;
  }

  const updateChannel = process.env.MEKSTATION_UPDATE_CHANNEL || 'latest';
  const updateFeedBaseUrl = process.env.MEKSTATION_UPDATE_FEED_BASE_URL;

  autoUpdater.disableDifferentialDownload = true;
  autoUpdater.channel = updateChannel;
  autoUpdater.allowDowngrade = false;
  autoUpdater.autoDownload = false;

  // Default: the GitHub Release assets (latest.yml, latest-linux.yml) that
  // release CI uploads. The old GitHub Pages feed was never published (404).
  const platformFeedUrl = updateFeedBaseUrl
    ? `${updateFeedBaseUrl.replace(/\/+$/, '')}/${process.platform === 'win32' ? 'win' : 'linux'}`
    : 'github:SwiggitySwerve/MekStation';
  autoUpdater.setFeedURL(
    updateFeedBaseUrl
      ? { provider: 'generic', url: platformFeedUrl, channel: updateChannel }
      : { provider: 'github', owner: 'SwiggitySwerve', repo: 'MekStation' },
  );

  console.log(
    `Auto-updater initialized | version=${app.getVersion()} | channel=${updateChannel} | platform=${process.platform} | arch=${process.arch} | feed=${platformFeedUrl}`,
  );

  // Background checks fail quietly: log each distinct failure once. Manual
  // checks and downloads report their own failures to the user.
  const loggedFailures = new Set<string>();
  const logFailureOnce = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    if (loggedFailures.has(message)) return;
    loggedFailures.add(message);
    console.warn(`Update check failed: ${message.split('\n')[0]}`);
  };
  const checkForUpdates = (): void => {
    autoUpdater.checkForUpdates()?.catch(logFailureOnce);
  };

  checkForUpdates();

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
    logFailureOnce(err);
    resetProgressBar();
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
    checkForUpdates();
  }, updateCheckIntervalMs);
}
