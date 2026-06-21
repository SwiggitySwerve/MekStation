const mockOpenExternal = jest.fn();
const mockOnHeadersReceived = jest.fn();
const mockBrowserWindowConstructor = jest.fn();
const mockShowMessageBox = jest.fn();
const mockDockShow = jest.fn();

const mockWebContents = {
  on: jest.fn(),
  once: jest.fn(),
  openDevTools: jest.fn(),
  setWindowOpenHandler: jest.fn(),
};

const mockWindow = {
  close: jest.fn(),
  focus: jest.fn(),
  getBounds: jest.fn(() => ({ x: 0, y: 0, width: 1280, height: 800 })),
  hide: jest.fn(),
  isDestroyed: jest.fn(() => false),
  isMaximized: jest.fn(() => false),
  loadURL: jest.fn(async () => undefined),
  maximize: jest.fn(),
  minimize: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  show: jest.fn(),
  unmaximize: jest.fn(),
  webContents: mockWebContents,
};

jest.mock('electron', () => ({
  app: {
    dock: { show: mockDockShow },
    isPackaged: false,
  },
  BrowserWindow: mockBrowserWindowConstructor,
  dialog: {
    showMessageBox: mockShowMessageBox,
  },
  screen: {
    getAllDisplays: jest.fn(() => [
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]),
    getPrimaryDisplay: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
  },
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: mockOnHeadersReceived,
      },
    },
  },
  shell: {
    openExternal: mockOpenExternal,
  },
}));

import { createMainWindow } from '../main.window';

function context() {
  return {
    appPath: 'E:/Projects/MekStation/desktop/dist/electron',
    config: {
      autoSaveInterval: 30000,
      backupInterval: 300000,
      developmentMode: true,
      enableAutoUpdater: false,
      enableBackups: true,
      enableSystemTray: false,
      updateCheckIntervalMs: 3600000,
      windowBounds: {
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 720,
      },
    },
    getAppIcon: () => 'icon.png',
    onClosed: jest.fn(),
    recentFilesService: null,
    sendToRenderer: jest.fn(),
    settingsService: null,
    shouldHideToTray: jest.fn(() => false),
    userDataPath: 'E:/tmp/mekstation-user-data',
  };
}

describe('desktop main window security boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowserWindowConstructor.mockImplementation(() => mockWindow);
  });

  it('enables Electron sandboxing and pins CSP headers in the main process', async () => {
    await createMainWindow(context());

    expect(mockBrowserWindowConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        webPreferences: expect.objectContaining({
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        }),
      }),
    );
    expect(mockOnHeadersReceived).toHaveBeenCalledWith(expect.any(Function));
  });

  it('blocks renderer navigation away from the expected app origin', async () => {
    await createMainWindow(context());

    const willNavigateCall = mockWebContents.on.mock.calls.find(
      ([channel]) => channel === 'will-navigate',
    );
    expect(willNavigateCall).toBeDefined();

    const handler = willNavigateCall?.[1] as
      | ((event: { preventDefault: jest.Mock }, url: string) => void)
      | undefined;
    const event = { preventDefault: jest.fn() };

    handler?.(event, 'file:///C:/Users/example/secrets.txt');

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('only opens explicitly safe external URL schemes', async () => {
    await createMainWindow(context());

    const handler = mockWebContents.setWindowOpenHandler.mock.calls[0]?.[0] as
      | ((details: { url: string }) => { action: 'deny' })
      | undefined;
    expect(handler).toBeDefined();

    expect(handler?.({ url: 'https://example.com/rules' })).toEqual({
      action: 'deny',
    });
    expect(mockOpenExternal).toHaveBeenCalledTimes(1);

    handler?.({ url: 'file:///C:/Users/example/secrets.txt' });
    handler?.({ url: 'javascript:alert(document.cookie)' });

    expect(mockOpenExternal).toHaveBeenCalledTimes(1);
  });
});
