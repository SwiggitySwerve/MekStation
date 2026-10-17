const mockShowMessageBox = jest.fn();
const mockStopEmbeddedServer = jest.fn();
const mockHandlers: Record<string, (...args: unknown[]) => unknown> = {};
const mockApp = {
  isPackaged: true,
  on: jest.fn((event: string, handler: (...args: unknown[]) => unknown) => {
    mockHandlers[event] = handler;
  }),
  quit: jest.fn(),
  requestSingleInstanceLock: jest.fn(() => true),
};

jest.mock('electron', () => ({
  app: mockApp,
  BrowserWindow: { getAllWindows: jest.fn(() => []) },
  dialog: { showMessageBox: mockShowMessageBox },
}));
jest.mock('../main.server', () => ({
  ...jest.requireActual('../main.server'),
  stopEmbeddedServer: () => mockStopEmbeddedServer(),
}));

import { cleanupServices } from '../main.cleanup';
import { registerAppEvents } from '../main.lifecycle';
import { loadPackagedUi } from '../main.window';

const APP_URL = 'http://127.0.0.1:3001';
const flush = () => new Promise((resolve) => setImmediate(resolve));
const fakeWindow = () => ({
  isDestroyed: jest.fn(() => false),
  loadURL: jest.fn(async (_url: string) => undefined),
});
const load = (window: object, waitUntilReady: jest.Mock) =>
  loadPackagedUi(window as never, { waitUntilReady }, { retryDelayMs: 0 });

describe('packaged UI startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows a loading page and loads the app only once the server is ready', async () => {
    const window = fakeWindow();
    let markReady!: () => void;
    const wait = jest.fn(() => new Promise<void>((r) => (markReady = r)));
    const loading = load(window, wait);
    await flush();
    expect(window.loadURL.mock.calls).toEqual([
      [expect.stringMatching(/^data:text\/html/)],
    ]);
    expect(wait).toHaveBeenCalledWith(120_000);

    markReady();
    await loading;
    expect(window.loadURL).toHaveBeenLastCalledWith(APP_URL);
    expect(mockShowMessageBox).not.toHaveBeenCalled();
  });

  it('offers Retry after a readiness timeout and loads when the retry succeeds', async () => {
    const window = fakeWindow();
    const wait = jest
      .fn()
      .mockRejectedValueOnce(new Error('did not become ready within 120 s'))
      .mockResolvedValueOnce(undefined);
    mockShowMessageBox.mockResolvedValueOnce({ response: 0 });
    await load(window, wait);
    expect(mockShowMessageBox).toHaveBeenCalledWith(
      window,
      expect.objectContaining({
        buttons: ['Retry', 'Quit'],
        detail: expect.stringContaining('did not become ready within 120 s'),
      }),
    );
    expect(wait).toHaveBeenCalledTimes(2);
    expect(window.loadURL).toHaveBeenLastCalledWith(APP_URL);
  });

  it('quits when the user chooses Quit', async () => {
    const window = fakeWindow();
    mockShowMessageBox.mockResolvedValueOnce({ response: 1 });
    await load(window, jest.fn().mockRejectedValue(new Error('exited')));
    expect(mockApp.quit).toHaveBeenCalledTimes(1);
    expect(window.loadURL).not.toHaveBeenCalledWith(APP_URL);
  });

  it('retries a transient connection refusal without a dialog', async () => {
    const window = fakeWindow();
    window.loadURL.mockRejectedValueOnce(undefined); // loading page (ignored)
    window.loadURL.mockRejectedValueOnce(new Error('ERR_CONNECTION_REFUSED'));
    await load(
      window,
      jest.fn(async () => undefined),
    );
    expect(window.loadURL).toHaveBeenCalledTimes(3);
    expect(window.loadURL).toHaveBeenLastCalledWith(APP_URL);
    expect(mockShowMessageBox).not.toHaveBeenCalled();
  });
});

describe('desktop quit lifecycle', () => {
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (platform) Object.defineProperty(process, 'platform', platform);
  });

  it('quits when the last window closes, after cleanup, without orphaning the server', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    let finishCleanup!: () => void;
    const cleanup = jest.fn(
      () => new Promise<void>((r) => (finishCleanup = r)),
    );
    registerAppEvents({
      cleanup,
      createMainWindow: jest.fn(),
      getMainWindow: () => null,
    });

    mockHandlers['window-all-closed']();
    expect(mockApp.quit).toHaveBeenCalledTimes(1);

    const firstQuit = { preventDefault: jest.fn() };
    mockHandlers['before-quit'](firstQuit);
    expect(firstQuit.preventDefault).toHaveBeenCalled();
    finishCleanup();
    await flush();
    expect(mockApp.quit).toHaveBeenCalledTimes(2);

    const secondQuit = { preventDefault: jest.fn() };
    mockHandlers['before-quit'](secondQuit);
    expect(secondQuit.preventDefault).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);

    const willQuit = { preventDefault: jest.fn() };
    mockHandlers['will-quit'](willQuit);
    expect(willQuit.preventDefault).not.toHaveBeenCalled();
    expect(mockStopEmbeddedServer).toHaveBeenCalled();
  });

  it('stops the embedded server as part of service cleanup', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await cleanupServices({
      backupService: null,
      localStorage: null,
      recentFilesService: null,
      sendToRenderer: jest.fn(async () => undefined),
      settingsService: null,
    });
    expect(mockStopEmbeddedServer).toHaveBeenCalledTimes(1);
  });
});
