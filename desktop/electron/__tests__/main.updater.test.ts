import { EventEmitter } from 'events';

const mockAutoUpdater = Object.assign(new EventEmitter(), {
  autoInstallOnAppQuit: true,
  checkForUpdates: jest.fn(),
  setFeedURL: jest.fn(),
});
jest.mock('electron', () => ({ app: { getVersion: () => '2.1.1' } }));
// Getter: SWC hoists imports above this file's const initialisers.
jest.mock('electron-updater', () => ({
  get autoUpdater() {
    return mockAutoUpdater;
  },
}));

import { initializeAutoUpdater } from '../main.updater';

const context = () => ({
  notifyUpdateAvailable: jest.fn(),
  notifyUpdateReady: jest.fn(),
  resetProgressBar: jest.fn(),
  updateCheckIntervalMs: 3_600_000,
  updateDownloadProgress: jest.fn(),
});
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('desktop auto-updater', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    mockAutoUpdater.removeAllListeners();
    mockAutoUpdater.autoInstallOnAppQuit = true;
    mockAutoUpdater.checkForUpdates.mockReset();
    mockAutoUpdater.setFeedURL.mockReset();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (platform) Object.defineProperty(process, 'platform', platform);
  });

  it('reads the GitHub Release assets and logs a failing background check once, without a dialog', async () => {
    const failure = new Error('Cannot find latest.yml: HttpError: 404');
    mockAutoUpdater.checkForUpdates.mockRejectedValue(failure);
    initializeAutoUpdater(context());
    expect(mockAutoUpdater.setFeedURL).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'github',
        owner: 'SwiggitySwerve',
        repo: 'MekStation',
      }),
    );

    mockAutoUpdater.emit('error', failure);
    jest.advanceTimersByTime(3_600_000);
    await flush();
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not auto-check or auto-install unsigned macOS builds', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    initializeAutoUpdater(context());
    expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(false);
    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
